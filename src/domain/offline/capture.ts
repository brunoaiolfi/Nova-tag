import type {CaptureOwner} from './owner';
import type {ExperimentalCapture} from '../experimentation/attempt';
import type {Provisioning} from '../traceability/provisioning';
import type {Observation} from '../traceability/observation';
import type {Decision} from '../traceability/decision';

export type TransportState =
  | 'QUEUED'
  | 'SENDING'
  | 'RETRY'
  | 'AUTH_REQUIRED'
  | 'STORED'
  | 'CONFLICT'
  | 'FAILED';

export type BusinessState = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface CaptureMetadata {
  provisioning: Provisioning;
  cacheUsed: boolean;
  experiment?: ExperimentalCapture;
}

export interface QueuedCapture {
  sequence: number;
  id: string;
  owner: CaptureOwner;
  payload: Observation;
  metadata: CaptureMetadata;
  createdAt: number;
  state: TransportState;
  businessState: BusinessState;
  attempts: number;
  nextAttemptAt: number;
  claim: string | null;
  leaseUntil: number | null;
  receipt: Decision | null;
  currentDecision: Decision | null;
  errorCode: string | null;
  message: string | null;
}
