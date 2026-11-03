import type {CaptureOwner} from '../offline/owner';
import type {ExperimentPlan} from './plan';
import type {ExperimentRecord} from './record';

export interface ExperimentalCapture {
  plan: ExperimentPlan;
  record: ExperimentRecord;
}

export interface Attempt {
  owner: CaptureOwner;
  plan: ExperimentPlan;
  id: string;
}
