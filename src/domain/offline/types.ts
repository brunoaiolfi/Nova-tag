import type {
  Observation,
  Provisioning,
  Decision,
  Reading,
} from '../traceability/types';

export type TransportState =
  | 'QUEUED'
  | 'SENDING'
  | 'RETRY'
  | 'AUTH_REQUIRED'
  | 'STORED'
  | 'CONFLICT'
  | 'FAILED';
export type BusinessState = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export interface CaptureOwner {
  baseUrl: string;
  userId: string;
}
export interface CaptureContext extends CaptureOwner {
  canCapture: boolean;
  canSend: boolean;
}
export interface CaptureMetadata {
  provisioning: Provisioning;
  cacheUsed: boolean;
  experiment?: import('../experimentation/types').ExperimentalCapture;
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
export interface Settlement {
  state: TransportState;
  businessState?: BusinessState;
  result?: Decision;
  errorCode?: string;
  message?: string;
  nextAttemptAt?: number;
}
export interface CaptureStore {
  initialize(): Promise<void>;
  enqueue(
    owner: CaptureOwner,
    payload: Observation,
    metadata: CaptureMetadata,
    now: number,
  ): Promise<QueuedCapture>;
  list(owner: CaptureOwner): Promise<QueuedCapture[]>;
  get(owner: CaptureOwner, id: string): Promise<QueuedCapture | null>;
  claim(
    owner: CaptureOwner,
    claim: string,
    now: number,
    leaseMs: number,
    limit: number,
  ): Promise<QueuedCapture[]>;
  settle(id: string, claim: string, settlement: Settlement): Promise<void>;
  resume(owner: CaptureOwner, now: number): Promise<void>;
  remember(
    owner: CaptureOwner,
    provisioning: Provisioning,
    now: number,
  ): Promise<void>;
  cached(
    owner: CaptureOwner,
    reading: Reading,
    now: number,
    maxAge: number,
  ): Promise<Provisioning | null>;
  updateDecision(
    owner: CaptureOwner,
    id: string,
    result: Decision,
  ): Promise<void>;
}
export class OfflineError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}
