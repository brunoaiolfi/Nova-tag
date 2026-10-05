export type Strategy = 'UID' | 'NDEF_ESTATICO';
export interface Reading {
  uid: string;
  ndef?: string;
  tecnologias?: string[];
}
export interface Provisioning {
  id: string;
  pedidoId: string;
  uid: string;
  estrategia: Strategy;
  status: 'REGISTRADA' | 'ATIVA' | 'DESPROVISIONADA';
  referenciaNdef: string | null;
}
export interface Observation {
  id: string;
  versaoContrato: 1;
  provisionamentoId: string;
  tipo: string;
  ocorridoEm: string;
  dispositivoId: string;
  leituraBruta: Reading;
}
export interface Decision {
  armazenada: boolean;
  decisao: {
    autorizada: boolean;
    motivo: string;
    classificacao: string;
    avisos: string[];
  };
}
export interface Api {
  request<T>(
    path: string,
    options?: {method?: string; body?: unknown; expectedUserId?: string},
  ): Promise<T>;
}
const referencePattern =
  /^urn:nfc-trace:provisioning:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export class TraceabilityWorkflow {
  constructor(private readonly api: Api) {}

  async register(
    code: string,
    reading: Reading,
    strategy: Strategy,
    model: string,
  ): Promise<Provisioning> {
    const normalizedCode = code.trim().toUpperCase();
    let order: {id: string; codigo: string; estado: string} | undefined;
    for (let page = 1; ; page++) {
      const result = await this.api.request<{
        itens: {id: string; codigo: string; estado: string}[];
        total: number;
      }>(
        `/pedidos?busca=${encodeURIComponent(
          normalizedCode,
        )}&pagina=${page}&limite=100`,
      );
      order = result.itens.find(item => item.codigo === normalizedCode);
      if (order || page * 100 >= result.total) {
        break;
      }
    }
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
          'Etiqueta já vinculada a outro pedido ou estratégia. Encerre o vínculo pela API antes de reutilizar.',
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
          modelo: model.trim(),
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
      provisioning.estrategia === 'NDEF_ESTATICO' &&
      reading.ndef !== provisioning.referenciaNdef
    ) {
      throw new Error('A referência NDEF lida diverge do vínculo registrado.');
    }
    return this.api.request<Provisioning>(
      `/provisionamentos/${provisioning.id}/ativacao`,
      {
        method: 'POST',
        body: {
          bloqueioConfirmado: true,
          ...(provisioning.estrategia === 'NDEF_ESTATICO'
            ? {referenciaNdef: reading.ndef}
            : {}),
        },
      },
    );
  }

  async prepare(
    reading: Reading,
    type: string,
    id: string,
    occurredAt: string,
    deviceId: string,
  ): Promise<Observation> {
    let provisioning: Provisioning | null;
    if (reading.ndef?.startsWith('urn:nfc-trace:provisioning:')) {
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
    return {
      id,
      versaoContrato: 1,
      provisionamentoId: provisioning.id,
      tipo: type,
      ocorridoEm: occurredAt,
      dispositivoId: deviceId,
      leituraBruta: reading,
    };
  }

  send(observation: Observation, userId: string) {
    return this.api.request<Decision>('/eventos', {
      method: 'POST',
      body: observation,
      expectedUserId: userId,
    });
  }
}
