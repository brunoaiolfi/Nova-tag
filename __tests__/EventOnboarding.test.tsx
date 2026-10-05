import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Button, PaperProvider} from 'react-native-paper';
import EtapasEvento from '../src/views/Eventos/Etapas';
import SelecionarEvento from '../src/views/Eventos/Etapas/SelecionarEvento';
import Leitor from '../src/components/Nfc/Leitor';
import {EnumTipoEvento} from '../src/domain/enums/tipoEvento';
import {traceability} from '../src/infra/traceability/runtime';

jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000001',
}));

jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {prepare: jest.fn(), send: jest.fn()},
  installationId: jest.fn().mockResolvedValue('ios-device'),
}));
jest.mock('../src/infra/auth/runtime', () => ({
  sessionManager: {getSnapshot: () => ({session: {user: {id: 'operator'}}})},
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
});

test('confirmation uses the physical scan time and retries the exact observation after lost response', async () => {
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
  const observation = {
    id: 'capture',
    versaoContrato: 1 as const,
    provisionamentoId: 'link',
    tipo: 'COLETA',
    ocorridoEm: scanTime,
    dispositivoId: 'ios-device',
    leituraBruta: reading,
  };
  jest.mocked(traceability.prepare).mockResolvedValueOnce(observation);
  jest
    .mocked(traceability.send)
    .mockRejectedValueOnce(new Error('Resposta perdida'))
    .mockResolvedValueOnce({
      armazenada: true,
      decisao: {
        autorizada: false,
        motivo: 'SEQUENCIA_INVALIDA',
        classificacao: 'REGULAR',
        avisos: [],
      },
    });
  expect(traceability.send).not.toHaveBeenCalled();
  await act(async () => {
    button('Confirmar coleta').props.onPress();
  });
  expect(traceability.prepare).toHaveBeenCalledWith(
    reading,
    'COLETA',
    expect.any(String),
    scanTime,
    'ios-device',
  );
  expect(
    tree.root
      .findAllByType(Button)
      .some(
        item => item.props.children === 'Ler outra etiqueta antes de enviar',
      ),
  ).toBe(false);
  await act(async () => {
    button('Tentar envio novamente').props.onPress();
  });
  expect(traceability.prepare).toHaveBeenCalledTimes(1);
  expect(jest.mocked(traceability.send).mock.calls[0]).toEqual(
    jest.mocked(traceability.send).mock.calls[1],
  );
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Captura salva no histórico');
  expect(text).toContain('Operação rejeitada · pedido não alterado');
  expect(text).toContain('etapas anteriores');
});
