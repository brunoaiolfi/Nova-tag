import React from 'react';
import {createAppServices} from '../src/bootstrap/create-app-services';
import type {
  AppServices,
  PhysicalNfc,
} from '../src/appplication/ports/app-services';
import type {SessionManager} from '../src/appplication/auth/session-manager';
import {AppServicesProvider} from '../src/components/Services/AppServicesProvider';
import {SessionProvider} from '../src/components/Auth/SessionProvider';

interface Overrides {
  session?: Partial<SessionManager>;
  traceability?: Partial<AppServices['traceability']>;
  administration?: Partial<AppServices['administration']>;
  experiment?: Partial<AppServices['experiment']>;
  offline?: Partial<AppServices['offline']>;
  nfc?: Partial<PhysicalNfc>;
  installationId?: AppServices['installationId'];
  randomUUID?: AppServices['randomUUID'];
  defaultApiUrl?: AppServices['defaultApiUrl'];
}

/** Each test owns its service graph. Unconfigured HTTP/physical calls fail loudly. */
export function createTestServices(overrides: Overrides = {}): AppServices {
  const unavailable = async (): Promise<never> => {
    throw new Error('Configure esta dependência no teste.');
  };
  const services = createAppServices({
    installationId: overrides.installationId,
    randomUUID: overrides.randomUUID,
    defaultApiUrl: overrides.defaultApiUrl,
    storage: {
      load: async () => null,
      save: async () => {},
      clear: async () => {},
    },
    transport: {send: unavailable},
    administrativeNfc: {
      run: unavailable,
      read: unavailable,
      cancel: async () => {},
    },
    connectivity: {subscribeWhenOnline: () => () => {}},
  });
  for (const key of [
    'session',
    'traceability',
    'administration',
    'experiment',
    'offline',
    'nfc',
  ] as const) {
    if (overrides[key]) Object.assign(services[key], overrides[key]);
  }
  if (overrides.installationId)
    services.installationId = overrides.installationId;
  if (overrides.randomUUID) services.randomUUID = overrides.randomUUID;
  if (overrides.defaultApiUrl) services.defaultApiUrl = overrides.defaultApiUrl;
  return services;
}

export function withServices(
  element: React.ReactElement,
  services: AppServices,
  provideSession = false,
) {
  return (
    <AppServicesProvider services={services}>
      {provideSession ? (
        <SessionProvider manager={services.session}>{element}</SessionProvider>
      ) : (
        element
      )}
    </AppServicesProvider>
  );
}
