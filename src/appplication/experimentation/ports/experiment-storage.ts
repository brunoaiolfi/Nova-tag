import type {CaptureOwner} from '../../../domain/offline/owner';
import type {ExperimentPlan} from '../../../domain/experimentation/plan';
import type {ExperimentRecord} from '../../../domain/experimentation/record';

export interface ExperimentStorage {
  initialize(): Promise<void>;
  select(
    owner: CaptureOwner,
    plan: ExperimentPlan | null,
    hold: boolean,
  ): Promise<void>;
  selection(
    owner: CaptureOwner,
  ): Promise<{plan: ExperimentPlan | null; hold: boolean}>;
  put(owner: CaptureOwner, record: ExperimentRecord): Promise<void>;
  records(owner: CaptureOwner): Promise<ExperimentRecord[]>;
  pending(owner: CaptureOwner, now: number): Promise<ExperimentRecord[]>;
  sent(owner: CaptureOwner, id: string): Promise<void>;
  retry(
    owner: CaptureOwner,
    id: string,
    now: number,
    definitive: boolean,
  ): Promise<void>;
  counts(
    owner: CaptureOwner,
  ): Promise<{pending: number; sent: number; failed: number}>;
}
