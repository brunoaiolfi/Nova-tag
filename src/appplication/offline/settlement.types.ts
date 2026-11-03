import type {TransportState} from '../../domain/offline/capture';
import type {BusinessState} from '../../domain/offline/capture';
import type {Decision} from '../../domain/traceability/decision';

export interface Settlement {
  state: TransportState;
  businessState?: BusinessState;
  result?: Decision;
  errorCode?: string;
  message?: string;
  nextAttemptAt?: number;
}
