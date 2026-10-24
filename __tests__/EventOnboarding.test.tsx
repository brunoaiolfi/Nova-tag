import {createTestServices, withServices} from '../test-support/app-services';
import React from 'react';
import {
  render as renderProbe,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';

import EtapasEvento from '../src/views/Eventos/Etapas';

import type {QueuedCapture} from '../src/domain/offline/capture';
const mockNavigate = jest.fn();
const mockCapture = jest.fn();
const mockSynchronize = jest.fn().mockResolvedValue(undefined);
let mockItems: QueuedCapture[] = [];
jest.mock('@react-navigation/native', () => ({
  NavigationContext: jest.requireActual('@react-navigation/native')
    .NavigationContext,
  useNavigation: () => ({getParent: () => ({navigate: mockNavigate})}),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000001',
}));

jest.mock('../src/components/Offline/OfflineProvider', () => ({
  useOffline: () => ({
    items: mockItems,
    loading: false,
    error: null,
    manager: {capture: mockCapture, synchronize: mockSynchronize},
  }),
}));

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
const services = createTestServices({
  experiment: {
    start: jest.fn().mockResolvedValue(null),
    finish: jest.fn().mockResolvedValue(undefined),
  },
  nfc: {readPhysicalTag: jest.fn()},
  installationId: jest.fn().mockResolvedValue('ios-device'),
  session: {
    getSnapshot: () => ({
      status: 'authenticated' as const,
      session: {
        user: {
          id: 'operator',
          login: 'operator',
          nome: 'Operador',
          perfil: 'OPERADOR' as const,
        },
        token: 'nfc_' + 'a'.repeat(43),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        baseUrl: 'http://localhost:3000/api/v1',
      },
    }),
  },
});

let tree: RenderResult;
const button = (label: string) => screen.getByRole('button', {name: label});
afterEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockItems = [];
});
test('confirms only after durable storage and retains scan time/UUID when a local save fails', async () => {
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <EtapasEvento />
      </PaperProvider>,
      services,
    ),
  );
  await fireEvent.press(screen.getByRole('radio', {name: 'Coleta'}));
  await fireEvent.press(button('Continuar'));
  const reading = {uid: '53721F76950001'};
  const scanTime = '2026-10-05T12:00:00.000Z';
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse(scanTime));
  jest.mocked(services.nfc.readPhysicalTag).mockResolvedValueOnce(reading);
  await fireEvent.press(button('Ler etiqueta'));
  await fireEvent.press(button('Continuar'));
  mockCapture.mockRejectedValueOnce(new Error('storage unavailable'));
  expect(mockCapture).not.toHaveBeenCalled();
  await fireEvent.press(button('Confirmar coleta'));
  expect(mockSynchronize).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Captura salva neste aparelho',
  );
  mockCapture.mockImplementationOnce(
    async (raw, type, id, time, device, owner) => {
      const saved: QueuedCapture = {
        id,
        sequence: 1,
        owner,
        payload: {
          id,
          versaoContrato: 1,
          provisionamentoId: 'link',
          tipo: type,
          ocorridoEm: time,
          dispositivoId: device,
          leituraBruta: raw,
        },
        metadata: {
          cacheUsed: true,
          provisioning: {
            id: 'link',
            pedidoId: 'order',
            uid: raw.uid,
            estrategia: 'UID',
            status: 'ATIVA',
            referenciaNdef: null,
            epoca: 1,
          },
        },
        createdAt: Date.now(),
        state: 'QUEUED',
        businessState: 'NONE',
        attempts: 0,
        nextAttemptAt: 0,
        claim: null,
        leaseUntil: null,
        receipt: null,
        currentDecision: null,
        errorCode: null,
        message: null,
      };
      mockItems = [saved];
      return saved;
    },
  );
  await fireEvent.press(button('Confirmar coleta'));
  expect(mockCapture.mock.calls[0]).toEqual(mockCapture.mock.calls[1]);
  expect(mockCapture).toHaveBeenCalledWith(
    reading,
    'COLETA',
    expect.any(String),
    scanTime,
    'ios-device',
    {userId: 'operator', baseUrl: 'http://localhost:3000/api/v1'},
    null,
  );
  expect(mockSynchronize).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Captura salva neste aparelho',
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Pode sair desta tela');
  await fireEvent.press(button('Ver envios'));
  expect(mockNavigate).toHaveBeenCalledWith('Envios');
});

test('changing the selected stage returns to the choices without saving a capture', async () => {
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <EtapasEvento />
      </PaperProvider>,
      services,
    ),
  );
  await fireEvent.press(screen.getByRole('radio', {name: 'Coleta'}));
  await fireEvent.press(button('Continuar'));
  expect(button('Trocar etapa')).toBeEnabled();
  await fireEvent.press(button('Trocar etapa'));
  expect(
    screen.queryByRole('button', {name: 'Ler etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole('radio', {name: 'Coleta'})).toBeVisible();
  expect(mockCapture).not.toHaveBeenCalled();
  expect(mockSynchronize).not.toHaveBeenCalled();
});
