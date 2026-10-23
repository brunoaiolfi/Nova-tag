import type {CaptureOwner} from '../../../domain/offline/owner';
import type {CaptureMetadata} from '../../../domain/offline/capture';
import type {QueuedCapture} from '../../../domain/offline/capture';
import type {Settlement} from '../settlement.types';
import type {Reading} from '../../../domain/traceability/reading';
import type {Provisioning} from '../../../domain/traceability/provisioning';
import type {Observation} from '../../../domain/traceability/observation';
import type {Decision} from '../../../domain/traceability/decision';

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
