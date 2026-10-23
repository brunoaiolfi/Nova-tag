import type {Decision} from '../../../domain/traceability/decision';

export interface HistoryEntry {
  historicoDecisoes?: Decision['decisao'][];
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
