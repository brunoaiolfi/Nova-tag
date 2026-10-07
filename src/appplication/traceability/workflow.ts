import type {
  Strategy,
  Reading,
  Provisioning,
  Observation,
  Decision,
} from '../../domain/traceability/types';
import {
  assertSdmReading,
  sdmProvisioningId,
} from '../../domain/traceability/sdm-reading';
export type {
  Strategy,
  Reading,
  Provisioning,
  Observation,
  Decision,
} from '../../domain/traceability/types';
export interface OrderSummary {
  id: string;
  codigo: string;
  descricao: string | null;
  estado: string;
}
export interface OrderPage {
  itens: OrderSummary[];
  total: number;
}
export interface OrderDetails extends OrderSummary {
  expedido: boolean;
  provisionamentoVigente?: Provisioning | null;
}
export interface OrderInput {
  codigo: string;
  descricao?: string;
}
export function normalizeOrderInput(input: OrderInput): OrderInput {
  const codigo = input.codigo.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(codigo)) {
    throw new Error(
      'Use até 64 letras sem acentos, números, pontos, traços ou sublinhados no código. Comece com uma letra ou número.',
    );
  }
  const descricao = input.descricao?.trim();
  if (descricao && descricao.length > 500) {
    throw new Error('A descrição pode ter até 500 caracteres.');
  }
  return {codigo, ...(descricao ? {descricao} : {})};
}

function uncertainResponse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const failure = error as {code?: string; status?: number};
  return (
    ['API_INDISPONIVEL', 'RESPOSTA_INVALIDA'].includes(failure.code ?? '') ||
    (failure.status !== undefined && failure.status >= 500)
  );
}
export interface HistoryEntry {
  id: string;
  tipo: string;
  ocorridoEm: string;
  recebidoEm: string;
  provisionamentoId: string;
  origem: 'CAPTURA' | 'SISTEMA';
  autoria: {
    tipo: 'AUTENTICADA' | 'DECLARADA';
    usuarioId: string | null;
    perfil: string | null;
  } | null;
  decisao: Decision['decisao'] & {
    alterouEstado: boolean;
    estadoAnterior: string | null;
    estadoResultante: string | null;
  };
}
export interface HistoryPage {
  itens: HistoryEntry[];
  proximaPagina: number | null;
  totalDoPedido: number;
}
export interface Api {
  request<T>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      expectedUserId?: string;
      expectedBaseUrl?: string;
    },
  ): Promise<T>;
}
const referencePattern =
  /^urn:nfc-trace:provisioning:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export class TraceabilityWorkflow {
  constructor(private readonly api: Api) {}

  listOrders(search = '', page = 1): Promise<OrderPage> {
    return this.api.request<OrderPage>(
      `/pedidos?busca=${encodeURIComponent(
        search.trim(),
      )}&pagina=${page}&limite=10`,
    );
  }

  order(id: string): Promise<OrderDetails> {
    return this.api.request<OrderDetails>(`/pedidos/${encodeURIComponent(id)}`);
  }

  async createOrder(
    input: OrderInput,
    userId: string,
  ): Promise<{order: OrderSummary; recovered: boolean}> {
    const normalized = normalizeOrderInput(input);
    try {
      const order = await this.api.request<OrderSummary>('/pedidos', {
        method: 'POST',
        body: normalized,
        expectedUserId: userId,
      });
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

  provisioning(id: string): Promise<Provisioning> {
    return this.api.request<Provisioning>(
      `/provisionamentos/${encodeURIComponent(id)}`,
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
      return await this.api.request<Provisioning>(`${path}/encerramento`, {
        method: 'POST',
        expectedUserId: userId,
      });
    } catch (error) {
      if (uncertainResponse(error)) {
        try {
          // The tag may already belong to a new epoch: never retry by latest UID.
          const persisted = await this.api.request<Provisioning>(path, {
            expectedUserId: userId,
          });
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
        ? await this.api.request<OrderPage>(path, {expectedUserId: userId})
        : await this.api.request<OrderPage>(path);
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
      const result = await this.api.request<{
        itens: HistoryEntry[];
        total: number;
      }>(
        `/pedidos/${encodeURIComponent(
          orderId,
        )}/eventos?pagina=${current}&limite=20`,
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
      return await this.api.request<Provisioning>('/etiquetas', {
        method: 'POST',
        body: {
          pedidoId: order.id,
          uid: reading.uid,
          modelo: existing?.modelo ?? model.trim(),
          estrategia: strategy,
        },
      });
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
      return await this.api.request<Provisioning>(
        `/etiquetas/${encodeURIComponent(uid)}`,
      );
    } catch (error) {
      if ((error as {code?: string}).code === 'ETIQUETA_NAO_ENCONTRADA') {
        return null;
      }
      throw error;
    }
  }

  activate(
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
    return this.api.request<Provisioning>(
      `/provisionamentos/${provisioning.id}/ativacao`,
      {
        method: 'POST',
        body: {
          bloqueioConfirmado: true,
          ...(provisioning.estrategia === 'SDM' ? {leituraSdm: reading} : {}),
          ...(provisioning.estrategia === 'NDEF_ESTATICO'
            ? {referenciaNdef: reading.ndef}
            : {}),
        },
      },
    );
  }

  async resolveProvisioning(reading: Reading): Promise<Provisioning> {
    let provisioning: Provisioning | null;
    if (reading.ndef?.startsWith('urn:nfc-trace:sdm:')) {
      const id = sdmProvisioningId(reading.ndef);
      provisioning = await this.api.request<Provisioning>(
        `/provisionamentos/${id}`,
      );
      assertSdmReading(provisioning, reading);
    } else if (
      typeof reading.ndef === 'string' &&
      reading.ndef.startsWith('urn:nfc-trace:provisioning:')
    ) {
      const match = referencePattern.exec(reading.ndef);
      if (!match) {
        throw new Error(
          'Referência NDEF inválida. Nenhum fallback para UID foi aplicado.',
        );
      }
      provisioning = await this.api.request<Provisioning>(
        `/provisionamentos/${match[1].toLowerCase()}`,
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

  send(observation: Observation, userId: string) {
    return this.api.request<Decision>('/eventos', {
      method: 'POST',
      body: observation,
      expectedUserId: userId,
    });
  }
}
