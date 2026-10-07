export type Strategy = 'UID' | 'NDEF_ESTATICO' | 'SDM';

export interface Reading {
  uid: string;
  ndef?: string;
  tecnologias?: string[];
  bytesBase64?: string;
  modelo?: string;
}

export interface Provisioning {
  sdm?: {
    perfil: string;
    perfilCandidato: boolean;
    politica: 'ESTRITA' | 'REGISTRO_TARDIO';
    referenciaChaves: string;
    versaoChaves: number;
    metaReadSlot: number;
    fileReadSlot: number;
    uriTemplate: string;
  };
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
  historicoDecisoes?: Decision['decisao'][];
  armazenada: boolean;
  decisao: {
    revisao?: number;
    status?: 'AUTORIZADA' | 'PENDENTE' | 'REJEITADA' | 'TARDIA';
    avaliadaEm?: string;
    causaId?: string | null;
    expiraEm?: string | null;
    dependencias?: {tipo: string; estadoNecessario: string}[];
    sdm?: {
      perfil: string;
      politica: 'ESTRITA' | 'REGISTRO_TARDIO';
      epoca: number;
      autenticada: boolean;
      previamenteUtilizada: boolean;
      contador: number | null;
      maiorContadorAnterior: number | null;
      temporalidade: 'NAO_AVALIADA' | 'NOVA' | 'TARDIA' | 'REUTILIZADA';
    };
    autorizada: boolean;
    motivo: string;
    classificacao: string;
    avisos: string[];
  };
}
