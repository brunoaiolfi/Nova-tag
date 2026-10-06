import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider} from 'react-native-paper';
import {ActionButton as Button} from '../src/components/Tracking';
import EtapasEvento from '../src/views/Eventos/Etapas';
import SelecionarEvento from '../src/views/Eventos/Etapas/SelecionarEvento';
import Leitor from '../src/components/Nfc/Leitor';
import {EnumTipoEvento} from '../src/domain/enums/tipoEvento';
import type {QueuedCapture} from '../src/domain/offline/types';
const mockNavigate = jest.fn();
const mockCapture = jest.fn();
const mockSynchronize = jest.fn().mockResolvedValue(undefined);
let mockItems: QueuedCapture[] = [];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({getParent: () => ({navigate: mockNavigate})}),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000001',
}));
jest.mock('../src/infra/traceability/runtime', () => ({
  installationId: jest.fn().mockResolvedValue('ios-device'),
}));
jest.mock('../src/components/Offline/OfflineProvider', () => ({
  useOffline: () => ({
    items: mockItems,
    loading: false,
    error: null,
    manager: {capture: mockCapture, synchronize: mockSynchronize},
  }),
}));
jest.mock('../src/infra/auth/runtime', () => ({
  sessionManager: {
    getSnapshot: () => ({
      status: 'authenticated',
      session: {
        user: {id: 'operator'},
        baseUrl: 'http://localhost:3000/api/v1',
      },
    }),
  },
}));
jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
let tree: TestRenderer.ReactTestRenderer;
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
  mockItems = [];
});
test('confirms only after durable storage and retains scan time/UUID when a local save fails', async () => {
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <EtapasEvento />
      </PaperProvider>,
    );
  });
  await act(async () => {
    tree.root
      .findByType(SelecionarEvento)
      .props.onSelecionarEvento(EnumTipoEvento.COLETA);
  });
  const reading = {uid: '53721F76950001'};
  const scanTime = '2026-10-05T12:00:00.000Z';
  await act(async () => {
    tree.root.findByType(Leitor).props.onLeituraRealizada(reading, scanTime);
  });
  mockCapture.mockRejectedValueOnce(new Error('storage unavailable'));
  expect(mockCapture).not.toHaveBeenCalled();
  await act(async () => {
    button('Confirmar coleta').props.onPress();
  });
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
  await act(async () => {
    button('Confirmar coleta').props.onPress();
  });
  expect(mockCapture.mock.calls[0]).toEqual(mockCapture.mock.calls[1]);
  expect(mockCapture).toHaveBeenCalledWith(
    reading,
    'COLETA',
    expect.any(String),
    scanTime,
    'ios-device',
    {userId: 'operator', baseUrl: 'http://localhost:3000/api/v1'},
  );
  expect(mockSynchronize).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Captura salva neste aparelho',
  );
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Você já pode sair desta tela',
  );
  await act(async () => {
    button('Acompanhar em Envios').props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('Envios');
});
