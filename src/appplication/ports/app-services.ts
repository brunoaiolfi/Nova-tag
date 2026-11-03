import type {SessionManager} from '../auth/session-manager';
import type {TraceabilityWorkflow} from '../traceability/workflow';
import type {OfflineCoordinator} from '../offline/coordinator';
import type {AdministrationCoordinator} from '../administration/coordinator';
import type {ExperimentJournal} from '../experimentation/journal';
import type {ExperimentCatalog} from '../experimentation/catalog';
import type {Reading} from '../../domain/traceability/reading';
import type {TagVersion} from '../../domain/nfc/type4';
import type {PhysicalTagReport} from '../nfc/physical-report';

/** Capabilities consumed by presentation; no SDK or adapter types cross this port. */
export interface PhysicalNfc {
  readonly physicalNfcAvailable: boolean;
  readPhysicalTag(write?: {uid: string; reference: string}): Promise<Reading>;
  cancelPhysicalRead(): Promise<void>;
  identifyAdministrativeTag(): Promise<{uid: string; version: TagVersion}>;
  diagnosePhysicalTag(): Promise<PhysicalTagReport>;
}

export interface Connectivity {
  subscribeWhenOnline(listener: () => void): () => void;
}

export interface AppServices {
  session: SessionManager;
  traceability: TraceabilityWorkflow;
  offline: OfflineCoordinator;
  administration: AdministrationCoordinator;
  experiment: ExperimentJournal;
  experimentCatalog: ExperimentCatalog;
  nfc: PhysicalNfc;
  connectivity: Connectivity;
  installationId(): Promise<string>;
  randomUUID(): string;
  defaultApiUrl(): string;
}
