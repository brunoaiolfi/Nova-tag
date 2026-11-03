import * as Crypto from 'expo-crypto';
import {SessionManager} from '../appplication/auth/session-manager';
import {TraceabilityWorkflow} from '../appplication/traceability/workflow';
import {OfflineCoordinator} from '../appplication/offline/coordinator';
import {AdministrationCoordinator} from '../appplication/administration/coordinator';
import type {AdministrativeNfc} from '../appplication/administration/coordinator';
import {ExperimentJournal} from '../appplication/experimentation/journal';
import {ExperimentCatalog} from '../appplication/experimentation/catalog';
import {
  captureContext,
  administrationContext,
} from '../appplication/auth/operation-context';
import type {
  AppServices,
  PhysicalNfc,
  Connectivity,
} from '../appplication/ports/app-services';
import type {SessionStorage} from '../appplication/auth/ports/session-storage';
import type {Transport} from '../appplication/auth/ports/transport';
import type {CaptureStore} from '../appplication/offline/ports/capture-store';
import type {AdminStore} from '../appplication/administration/ports/admin-store';
import type {ExperimentStorage} from '../appplication/experimentation/ports/experiment-storage';
import type {MonotonicClock} from '../appplication/experimentation/ports/monotonic-clock';
import {SecureSessionStorage} from '../infra/auth/secure-session-storage';
import {HttpTransport} from '../infra/auth/http-transport';
import {defaultApiUrl} from '../infra/auth/default-api-url';
import {SqliteCaptureStore} from '../infra/offline/sqlite-store';
import {openCaptureDatabase} from '../infra/offline/database';
import {SqliteExperimentJournal} from '../infra/experimentation/sqlite-journal';
import {SqliteAdministrationStore} from '../infra/administration/sqlite-store';
import {openAdministrationDatabase} from '../infra/administration/database';
import {NativeAdministrativeNfc} from '../infra/nfc/administration';
import * as reader from '../infra/nfc/reader';
import {identifyAdministrativeTag} from '../infra/nfc/administration';
import {diagnosePhysicalTag} from '../infra/nfc/diagnostics';
import {connectivity} from '../infra/network/connectivity';
import {createInstallationId} from '../infra/device/installation-id';

interface Adapters {
  session?: SessionManager;
  storage?: SessionStorage;
  transport?: Transport;
  captureStore?: CaptureStore;
  experimentStorage?: ExperimentStorage;
  administrationStore?: AdminStore;
  administrativeNfc?: AdministrativeNfc;
  nfc?: PhysicalNfc;
  connectivity?: Connectivity;
  installationId?: () => Promise<string>;
  randomUUID?: () => string;
  defaultApiUrl?: () => string;
  sessionMarker?: (token: string) => Promise<string>;
  clock?: MonotonicClock;
  now?: () => number;
  development?: boolean;
}

/** One composition per app instance. Creation performs no network or physical NFC operation. */
export function createAppServices(adapters: Adapters = {}): AppServices {
  const now = adapters.now ?? Date.now;
  const randomUUID = adapters.randomUUID ?? (() => Crypto.randomUUID());
  const session =
    adapters.session ??
    new SessionManager(
      adapters.storage ?? new SecureSessionStorage(),
      adapters.transport ?? new HttpTransport(),
      adapters.development ?? __DEV__,
      now,
    );
  const traceability = new TraceabilityWorkflow(session);
  const installationId = adapters.installationId ?? createInstallationId();
  const captureStore =
    adapters.captureStore ?? new SqliteCaptureStore(openCaptureDatabase);
  const context = () => captureContext(session.getSnapshot(), now());
  const experiment = new ExperimentJournal(
    adapters.experimentStorage ??
      new SqliteExperimentJournal(openCaptureDatabase, () =>
        captureStore.initialize(),
      ),
    context,
    session,
    randomUUID,
    adapters.clock ?? {originId: randomUUID(), nowMs: () => performance.now()},
    installationId,
    now,
  );
  const offline = new OfflineCoordinator(
    captureStore,
    context,
    session,
    reading => traceability.resolveProvisioning(reading),
    randomUUID,
    now,
    experiment,
  );
  const marker =
    adapters.sessionMarker ??
    ((token: string) =>
      Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token));
  const administration = new AdministrationCoordinator(
    session,
    adapters.administrationStore ??
      new SqliteAdministrationStore(openAdministrationDatabase),
    adapters.administrativeNfc ?? new NativeAdministrativeNfc(),
    () =>
      administrationContext(session.getSnapshot, installationId, marker, now),
    randomUUID,
    now,
  );
  return {
    session,
    traceability,
    offline,
    administration,
    experiment,
    experimentCatalog: new ExperimentCatalog(session),
    nfc: adapters.nfc ?? {
      physicalNfcAvailable: reader.physicalNfcAvailable,
      readPhysicalTag: reader.readPhysicalTag,
      cancelPhysicalRead: reader.cancelPhysicalRead,
      identifyAdministrativeTag,
      diagnosePhysicalTag,
    },
    connectivity: adapters.connectivity ?? connectivity,
    installationId,
    randomUUID,
    defaultApiUrl: adapters.defaultApiUrl ?? defaultApiUrl,
  };
}
