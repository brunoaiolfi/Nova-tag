import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {createTestServices, withServices} from '../test-support/app-services';
import Envios from '../src/views/Envios';
import type {OfflineSnapshot} from '../src/appplication/offline/coordinator';
import type {AuthSnapshot} from '../src/appplication/auth/session-manager';
import type {QueuedCapture} from '../src/domain/offline/capture';
import {provisioning} from '../tests/support/administration';

const mockSession = {
  baseUrl: 'http://127.0.0.1:3115/api/v1',
  token: 'nfc_' + 'a'.repeat(43),
  expiresAt: '2030-01-01T00:00:00.000Z',
  user: {
    id: 'operator',
    login: 'operator',
    nome: 'Operador',
    perfil: 'ADMINISTRADOR' as const,
  },
};
let mockAuth: AuthSnapshot;
let mockQueue: OfflineSnapshot;
const mockServices = createTestServices({
  session: {
    getSnapshot: () => mockAuth,
    restore: jest.fn().mockResolvedValue(undefined),
  },
  offline: {
    synchronize: jest.fn().mockResolvedValue(undefined),
    refreshDecisions: jest.fn().mockResolvedValue(undefined),
  },
  experiment: {
    state: jest
      .fn()
      .mockResolvedValue({
        plan: null,
        hold: false,
        pending: 0,
        sent: 0,
        failed: 0,
      }),
    flush: jest.fn().mockResolvedValue(undefined),
  },
});
jest.mock('../src/components/Offline/OfflineProvider', () => ({
  useOffline: () => ({...mockQueue, manager: mockServices.offline}),
}));
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({state: mockAuth, manager: mockServices.session}),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));

async function mount() {
  await render(
    withServices(
      <PaperProvider>
        <Envios />
      </PaperProvider>,
      mockServices,
    ),
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = {status: 'authenticated', session: mockSession};
  mockQueue = {items: [], loading: false, syncing: false, error: null};
});

test('an empty outbox has a light surface and no misleading pending count', async () => {
  await mount();
  expect(screen.getByTestId('outbox-list')).toHaveStyle({
    backgroundColor: 'white',
  });
  expect(screen.getByRole('header', {name: 'Suas capturas'})).toBeVisible();
  expect(screen.getByText('Nenhuma captura por aqui')).toBeVisible();
  expect(screen.queryByText(/0 capturas aguardando/)).not.toBeOnTheScreen();
  expect(
    screen.getByRole('button', {name: 'Ensaio do TCC'}),
  ).toBeCollapsed();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Preparar uso offline'}),
  );
  expect(screen.getByRole('button', {name: 'Preparar etiqueta'})).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', {name: 'Ensaio do TCC'}));
  expect(screen.getByRole('button', {name: 'Buscar roteiros'})).toBeVisible();
});

test('loading and storage errors do not present the empty success state', async () => {
  mockQueue = {...mockQueue, loading: true};
  const tree = await render(
    withServices(
      <PaperProvider>
        <Envios />
      </PaperProvider>,
      mockServices,
    ),
  );
  expect(screen.getByLabelText('Abrindo capturas salvas')).toBeOnTheScreen();
  expect(screen.queryByText('Nenhuma captura por aqui')).not.toBeOnTheScreen();
  mockQueue = {
    ...mockQueue,
    loading: false,
    error: 'Não foi possível abrir as capturas.',
  };
  await tree.rerender(
    withServices(
      <PaperProvider>
        <Envios />
      </PaperProvider>,
      mockServices,
    ),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(mockQueue.error!);
  expect(screen.getByRole('button', {name: 'Sincronizar'})).toBeDisabled();
  expect(screen.queryByText('Nenhuma captura por aqui')).not.toBeOnTheScreen();
});

test('synchronization still sends through the queue and refreshes decisions and experiment stages', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('button', {name: 'Sincronizar'}));
  expect(mockServices.offline.synchronize).toHaveBeenCalledWith(true);
  expect(mockServices.offline.refreshDecisions).toHaveBeenCalledTimes(1);
  expect(mockServices.experiment.flush).toHaveBeenCalledTimes(1);
});

test('saved captures retain their status and original receipt details', async () => {
  const capture: QueuedCapture = {
    sequence: 1,
    id: 'capture',
    owner: {baseUrl: mockSession.baseUrl, userId: mockSession.user.id},
    payload: {
      id: 'capture',
      versaoContrato: 1,
      provisionamentoId: provisioning.id,
      tipo: 'COLETA',
      ocorridoEm: '2026-11-03T12:00:00Z',
      dispositivoId: 'device',
      operadorId: mockSession.user.id,
      leituraBruta: {uid: provisioning.uid},
    },
    metadata: {provisioning, cacheUsed: false},
    createdAt: 0,
    state: 'QUEUED',
    businessState: 'NONE',
    attempts: 2,
    nextAttemptAt: 0,
    claim: null,
    leaseUntil: null,
    receipt: null,
    currentDecision: null,
    errorCode: null,
    message: null,
  };
  mockQueue = {...mockQueue, items: [capture]};
  await mount();
  expect(screen.queryByText('Nenhuma captura por aqui')).not.toBeOnTheScreen();
  expect(screen.getByText(/1 captura aguardando confirmação/)).toBeVisible();
  expect(screen.getByText('Coleta · ' + provisioning.uid)).toBeVisible();
  await fireEvent.press(screen.getByText('Comprovante e vínculo original'));
  expect(screen.getByText('Envios tentados: 2')).toBeVisible();
  expect(screen.getByText('Vínculo: ' + provisioning.id)).toBeVisible();
});

test('consultation profiles cannot synchronize or prepare physical tags', async () => {
  mockAuth = {
    status: 'authenticated',
    session: {...mockSession, user: {...mockSession.user, perfil: 'CONSULTA'}},
  };
  await mount();
  expect(screen.getByRole('button', {name: 'Sincronizar'})).toBeDisabled();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Preparar uso offline'}),
  );
  expect(
    screen.getByRole('button', {name: 'Preparar etiqueta'}),
  ).toBeDisabled();
  expect(
    screen.queryByRole('button', {name: 'Ensaio do TCC'}),
  ).not.toBeOnTheScreen();
});
