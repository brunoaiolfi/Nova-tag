import type {Reading} from './reading';

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
