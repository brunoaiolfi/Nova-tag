import type {Strategy} from './reading';

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
