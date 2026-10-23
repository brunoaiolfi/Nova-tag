import type {Strategy} from '../traceability/reading';

export type Material = 'ATUAL' | 'ALVO';

export type PhysicalOutcome = 'NAO_ALTERADA' | 'NAO_CONFIRMADA' | 'CONFERIDA';

export interface Personalization {
  perfil: 'nfc-trace.personalization.v1';
  referenciaAlvo: string;
  versoesAlvo: number[];
  imagemNdefHex: string;
  imagemCcHex: string;
  configuracaoNdefFinalHex: string;
  configuracaoCcFinalHex: string;
  perfilSdm: string | null;
}

export interface AdminOperation {
  id: string;
  plano: {
    versao: 1;
    finalidade: 'PERSONALIZACAO';
    provisionamentoId: string;
    uid: string;
    epoca: number;
    estrategia: Strategy;
    referenciaCredenciais: string;
    versoesChaves: number[];
    personalizacao: Personalization;
  };
  hashPlano: string;
  administradorId: string;
  estacao: string;
  criadaEm: string;
  sessaoAtivaId: string | null;
  status:
    | 'PREPARADA'
    | 'PERSONALIZANDO'
    | 'PERSONALIZADA'
    | 'INTERROMPIDA'
    | 'ENCERRADA';
  alteracaoEmitida: boolean;
  conteudoConferido: boolean;
  alteracaoFisica: PhysicalOutcome;
}
