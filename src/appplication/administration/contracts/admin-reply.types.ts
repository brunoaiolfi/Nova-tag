import type {PhysicalOutcome} from '../../../domain/administration/operation';
import type {AdminCommand} from '../../../domain/nfc/administrative-command.types';

export interface PersonalizationResult {
  uid: string;
  personalizada: boolean;
  configuracaoNdefHex: string;
  versoesChaves: number[];
  slotsAutenticados: number[];
}
interface ReplyEnvelope {
  sessaoId: string;
  expiraEm: string;
  alteracaoFisica: PhysicalOutcome;
}
export type AdminReply = ReplyEnvelope &
  (
    | {
        status: 'EM_ANDAMENTO';
        comando: AdminCommand;
        resultado: null;
        codigo: null;
      }
    | {
        status: 'CONCLUIDA';
        comando: null;
        resultado: PersonalizationResult & {personalizada: true};
        codigo: null;
        alteracaoFisica: 'CONFERIDA';
      }
    | {
        status: 'INTERROMPIDA';
        comando: null;
        resultado: PersonalizationResult | null;
        codigo: string | null;
      }
  );
