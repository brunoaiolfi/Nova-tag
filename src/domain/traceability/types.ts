export type Strategy = 'UID' | 'NDEF_ESTATICO';

export interface Reading {
  uid: string;
  ndef?: string;
  tecnologias?: string[];
  bytesBase64?: string;
  modelo?: string;
}

export interface Provisioning {
  id: string;
  pedidoId: string;
  uid: string;
  estrategia: Strategy;
  status: 'REGISTRADA' | 'ATIVA' | 'DESPROVISIONADA';
  referenciaNdef: string | null;
  epoca?: number;
  modelo?: string;
}

export interface Observation {
  id: string;
  versaoContrato: 1;
  provisionamentoId: string;
  tipo: string;
  ocorridoEm: string;
  dispositivoId: string;
  operadorId?: string;
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
