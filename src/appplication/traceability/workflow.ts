import {decodeOrderPage} from './contracts/order-decoder';
import {decodeOrderDetails} from './contracts/order-decoder';
import {decodeOrder} from './contracts/order-decoder';
import {decodeProvisioning} from './contracts/provisioning-decoder';
import {decodeHistoryItems} from './contracts/history-decoder';
import {decodeDecision} from './contracts/decision-decoder';
import type {Api} from '../auth/ports/authenticated-api';
import type {
  OrderSummary,
  OrderPage,
  OrderDetails,
  OrderInput,
} from './contracts/order.types';
import type {HistoryPage} from './contracts/history.types';
import {normalizeOrderInput} from './order-input-policy';
import type {Strategy, Reading} from '../../domain/traceability/reading';
import type {Provisioning} from '../../domain/traceability/provisioning';
import type {Observation} from '../../domain/traceability/observation';
import {
  assertSdmReading,
  sdmProvisioningId,
} from '../../domain/traceability/sdm-reading';

function uncertainResponse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const failure = errorDetails(error);
  return (
    ['API_INDISPONIVEL', 'RESPOSTA_INVALIDA'].includes(failure.code ?? '') ||
    (failure.status !== undefined && failure.status >= 500)
  );
}
const referencePattern =
  /^urn:nfc-trace:provisioning:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export class TraceabilityWorkflow {
  constructor(private readonly api: Api) {}

  async listOrders(search = '', page = 1): Promise<OrderPage> {
    return decodeOrderPage(
      await this.api.request(
        `/pedidos?busca=${encodeURIComponent(
          search.trim(),
        )}&pagina=${page}&limite=10`,
      ),
    );
  }

  async order(id: string): Promise<OrderDetails> {
    return decodeOrderDetails(
      await this.api.request(`/pedidos/${encodeURIComponent(id)}`),
    );
  }

  async createOrder(
    input: OrderInput,
    userId: string,
  ): Promise<{order: OrderSummary; recovered: boolean}> {
    const normalized = normalizeOrderInput(input);
    try {
      const order = decodeOrder(
        await this.api.request('/pedidos', {
          method: 'POST',
          body: normalized,
          expectedUserId: userId,
        }),
      );
      return {order, recovered: false};
    } catch (error) {
      if (uncertainResponse(error)) {
        try {
          const order = await this.findOrderByCode(normalized.codigo, userId);
          if (
            order &&
            (order.descricao ?? null) === (normalized.descricao ?? null)
          ) {
            return {order, recovered: true};
          }
        } catch {
          /* The original failure remains actionable if recovery is unavailable. */
        }
      }
      throw error;
    }
  }

  async provisioning(id: string): Promise<Provisioning> {
    return decodeProvisioning(
      await this.api.request(`/provisionamentos/${encodeURIComponent(id)}`),
    );
  }

  /** Administrative lookup targets the physical UID, independent of NDEF copies. */
  tag(uid: string): Promise<Provisioning | null> {
    return this.findByUid(uid);
  }

  async closeProvisioning(
    provisioning: Provisioning,
    userId: string,
  ): Promise<Provisioning> {
    const path = `/provisionamentos/${encodeURIComponent(provisioning.id)}`;
    try {
      return decodeProvisioning(
        await this.api.request(`${path}/encerramento`, {
          method: 'POST',
          expectedUserId: userId,
        }),
      );
    } catch (error) {
      if (uncertainResponse(error)) {
        try {
          // The tag may already belong to a new epoch: never retry by latest UID.
          const persisted = decodeProvisioning(
            await this.api.request(path, {
              expectedUserId: userId,
            }),
          );
          if (persisted.status === 'DESPROVISIONADA') {
            return persisted;
          }
        } catch {
          /* Preserve the original failure. */
        }
      }
      throw error;
    }
  }

  private async findOrderByCode(
    code: string,
    userId?: string,
  ): Promise<OrderSummary | undefined> {
    for (let page = 1; ; page++) {
      const path = `/pedidos?busca=${encodeURIComponent(
        code,
      )}&pagina=${page}&limite=100`;
      const result = userId
        ? decodeOrderPage(
            await this.api.request(path, {expectedUserId: userId}),
          )
        : decodeOrderPage(await this.api.request(path));
      const order = result.itens.find(item => item.codigo === code);
      if (order || page * 100 >= result.total || result.itens.length === 0) {
        return order;
      }
    }
  }

  async history(
    orderId: string,
    page = 1,
    provisioningId?: string,
  ): Promise<HistoryPage> {
    for (let current = page; ; current++) {
      const result = decodeHistoryItems(
        await this.api.request(
          `/pedidos/${encodeURIComponent(
            orderId,
          )}/eventos?pagina=${current}&limite=20`,
        ),
      );
      const itens = provisioningId
        ? result.itens.filter(item => item.provisionamentoId === provisioningId)
        : result.itens;
      const proximaPagina =
        current * 20 >= result.total || result.itens.length === 0
          ? null
          : current + 1;
      // A page can contain only another epoch; continue until a match or the end.
      if (itens.length || proximaPagina === null) {
        return {itens, proximaPagina, totalDoPedido: result.total};
      }
    }
  }

  async register(
    code: string,
    reading: Reading,
    strategy: Strategy,
    model: string,
  ): Promise<Provisioning> {
    if (strategy === 'SDM')
      throw new Error(
        'O provisionamento SDM é administrado pela bancada. Configure fisicamente a NTAG 424 DNA antes de ativar o vínculo.',
      );
    const normalizedCode = code.trim().toUpperCase();
    const order = await this.findOrderByCode(normalizedCode);
    if (!order) {
      throw new Error(
        'Pedido não encontrado. Cadastre-o na API antes de provisionar.',
      );
    }
    if (order.estado !== 'CADASTRADO') {
      throw new Error('O pedido precisa estar CADASTRADO.');
    }
    const existing = await this.findByUid(reading.uid);
    if (existing && existing.status !== 'DESPROVISIONADA') {
      if (existing.pedidoId !== order.id || existing.estrategia !== strategy) {
        throw new Error(
          'Etiqueta já vinculada a outro pedido ou estratégia. Abra Gerenciar etiqueta e encerre o vínculo antes de reutilizar.',
        );
      }
      return existing;
    }
    try {
      return decodeProvisioning(
        await this.api.request('/etiquetas', {
          method: 'POST',
          body: {
            pedidoId: order.id,
            uid: reading.uid,
            modelo: existing?.modelo ?? model.trim(),
            estrategia: strategy,
          },
        }),
      );
    } catch (error) {
      // A response can be lost after commit. Recover only the exact persisted link.
      const recovered = await this.findByUid(reading.uid);
      if (
        recovered &&
        recovered.pedidoId === order.id &&
        recovered.estrategia === strategy &&
        recovered.status !== 'DESPROVISIONADA'
      ) {
        return recovered;
      }
      throw error;
    }
  }

  private async findByUid(uid: string): Promise<Provisioning | null> {
    try {
      return decodeProvisioning(
        await this.api.request(`/etiquetas/${encodeURIComponent(uid)}`),
      );
    } catch (error) {
      if (errorDetails(error).code === 'ETIQUETA_NAO_ENCONTRADA') {
        return null;
      }
      throw error;
    }
  }

  validateActivation(
    provisioning: Provisioning,
    reading: Reading,
    physicalConfirmed: boolean,
  ) {
    if (!physicalConfirmed) {
      throw new Error('Confira a configuração física antes de ativar.');
    }
    if (reading.uid !== provisioning.uid) {
      throw new Error('A etiqueta lida é diferente da etiqueta registrada.');
    }
    if (
      provisioning.estrategia === 'UID' &&
      typeof reading.ndef === 'string' &&
      reading.ndef.startsWith('urn:nfc-trace:provisioning:')
    ) {
      throw new Error(
        'A etiqueta ainda contém uma referência NDEF do projeto. Remova-a com a ferramenta de configuração e faça uma nova leitura antes de ativar por UID.',
      );
    }
    if (
      provisioning.estrategia === 'NDEF_ESTATICO' &&
      reading.ndef !== provisioning.referenciaNdef
    ) {
      throw new Error('A referência NDEF lida diverge do vínculo registrado.');
    }
    assertSdmReading(provisioning, reading);
  }

  activate(
    provisioning: Provisioning,
    reading: Reading,
    physicalConfirmed: boolean,
  ) {
    this.validateActivation(provisioning, reading, physicalConfirmed);
    return this.api
      .request(`/provisionamentos/${provisioning.id}/ativacao`, {
        method: 'POST',
        body: {
          bloqueioConfirmado: true,
          ...(provisioning.estrategia === 'SDM' ? {leituraSdm: reading} : {}),
          ...(provisioning.estrategia === 'NDEF_ESTATICO'
            ? {referenciaNdef: reading.ndef}
            : {}),
        },
      })
      .then(decodeProvisioning);
  }

  async resolveProvisioning(reading: Reading): Promise<Provisioning> {
    let provisioning: Provisioning | null;
    if (reading.ndef?.startsWith('urn:nfc-trace:sdm:')) {
      const id = sdmProvisioningId(reading.ndef);
      provisioning = decodeProvisioning(
        await this.api.request(`/provisionamentos/${id}`),
      );
      assertSdmReading(provisioning, reading);
    } else if (
      typeof reading.ndef === 'string' &&
      reading.ndef.startsWith('urn:nfc-trace:provisioning:')
    ) {
      const match = referencePattern.exec(reading.ndef);
      if (!match?.[1]) {
        throw new Error(
          'Referência NDEF inválida. Nenhum fallback para UID foi aplicado.',
        );
      }
      provisioning = decodeProvisioning(
        await this.api.request(`/provisionamentos/${match[1].toLowerCase()}`),
      );
    } else {
      provisioning = await this.findByUid(reading.uid);
    }
    if (!provisioning) {
      throw new Error('Etiqueta ainda não provisionada.');
    }
    assertSdmReading(provisioning, reading);
    return provisioning;
  }

  async prepare(
    reading: Reading,
    type: string,
    id: string,
    occurredAt: string,
    deviceId: string,
  ): Promise<Observation> {
    // Freeze the exact evidence before the first await, so retries/slow lookups
    // cannot alter the captured bytes, URI or declared metadata.
    const raw: Reading = {
      uid: reading.uid,
      ...(reading.ndef !== undefined ? {ndef: reading.ndef} : {}),
      ...(reading.bytesBase64 !== undefined
        ? {bytesBase64: reading.bytesBase64}
        : {}),
      ...(reading.modelo !== undefined ? {modelo: reading.modelo} : {}),
      ...(reading.tecnologias !== undefined
        ? {tecnologias: [...reading.tecnologias]}
        : {}),
    };
    if (raw.tecnologias) Object.freeze(raw.tecnologias);
    Object.freeze(raw);
    const provisioning = await this.resolveProvisioning(raw);
    return Object.freeze({
      id,
      versaoContrato: 1,
      provisionamentoId: provisioning.id,
      tipo: type,
      ocorridoEm: occurredAt,
      dispositivoId: deviceId,
      leituraBruta: raw,
    });
  }

  async send(observation: Observation, userId: string) {
    return decodeDecision(
      await this.api.request('/eventos', {
        method: 'POST',
        body: observation,
        expectedUserId: userId,
      }),
    );
  }
}
import {errorDetails} from '../../domain/validation/error-details';
