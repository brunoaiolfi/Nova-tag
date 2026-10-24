import {createTestServices, withServices} from '../test-support/app-services';
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
import EtapasProvisionamento from '../src/views/Provisionar/Etapas';
import {EnumEstrategiasNFC} from '../src/domain/enums/estrategiasNFC';
import type {AuthSnapshot} from '../src/appplication/auth/session-manager';
import type {Reading} from '../src/domain/traceability/reading';
import {renderedText} from '../test-support/rendered-text';

let mockParams: {
  estrategia: number;
  expectedUid?: string;
  registeredModel?: string;
};
const mockNavigation = {navigate: jest.fn(), popTo: jest.fn()};
jest.mock('@react-navigation/native', () => ({
  NavigationContext: jest.requireActual('@react-navigation/native')
    .NavigationContext,
  useRoute: () => ({params: mockParams}),
  useNavigation: () => mockNavigation,
}));
jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
const auth: AuthSnapshot = {
  status: 'authenticated',
  session: {
    baseUrl: 'http://localhost:3000/api/v1',
    token: 'nfc_' + 'a'.repeat(43),
    expiresAt: '2030-01-01T00:00:00Z',
    user: {id: 'admin', login: 'admin', nome: 'Admin', perfil: 'ADMINISTRADOR'},
  },
};
const orders = [
  {id: 'order', codigo: 'TCC-001', descricao: null, estado: 'CADASTRADO'},
  {id: 'new-order', codigo: 'TCC-002', descricao: null, estado: 'CADASTRADO'},
  {
    id: 'ndef-order',
    codigo: 'TEST-NDEF',
    descricao: null,
    estado: 'CADASTRADO',
  },
];
const services = createTestServices({
  session: {
    getSnapshot: () => auth,
    restore: jest.fn().mockResolvedValue(undefined),
    expireIfNeeded: jest.fn().mockResolvedValue(undefined),
  },
  nfc: {readPhysicalTag: jest.fn()},
  traceability: {
    listOrders: jest.fn().mockResolvedValue({itens: orders, total: 3}),
    createOrder: jest.fn(),
    register: jest.fn(),
    activate: jest.fn(),
  },
});
const {traceability} = services;
const button = (name: string) => screen.getByRole('button', {name});
const confirmation = () =>
  screen.getByRole('checkbox', {name: 'Conferi a configuração e o bloqueio'});
const primaryLabels = () =>
  screen
    .queryAllByRole('button')
    .filter(control =>
      [MD3LightTheme.colors.primary, '#E2E8F0'].includes(
        StyleSheet.flatten(control.props.style)?.backgroundColor,
      ),
    )
    .map(control => control.props.accessibilityLabel);
async function mount() {
  return render(
    withServices(
      <PaperProvider>
        <EtapasProvisionamento />
      </PaperProvider>,
      services,
      true,
    ),
  );
}
async function selectOrder(code: string) {
  await fireEvent.press(
    await screen.findByRole('button', {name: new RegExp(code)}),
  );
}
async function readTag(reading: Reading, write = false) {
  jest.mocked(services.nfc.readPhysicalTag).mockResolvedValueOnce(reading);
  await fireEvent.press(button(write ? 'Gravar NDEF' : 'Ler etiqueta'));
  await fireEvent.press(button('Continuar'));
}
beforeEach(() => {
  mockParams = {estrategia: 2};
});
afterEach(() => {
  jest.clearAllMocks();
});

test('an explicitly confirmed created order becomes the selected persisted order', async () => {
  await mount();
  await fireEvent.press(button('Novo pedido'));
  const saved = {
    id: 'server-uuid',
    codigo: 'NOVO-001',
    descricao: 'Caixa nova',
    estado: 'CADASTRADO',
  };
  expect(screen.queryByPlaceholderText('Buscar pedido')).not.toBeOnTheScreen();
  jest
    .mocked(traceability.createOrder)
    .mockResolvedValueOnce({order: saved, recovered: false});
  await fireEvent.changeText(
    screen.getByLabelText('Código do pedido'),
    saved.codigo,
  );
  await fireEvent.changeText(
    screen.getByLabelText('Descrição (opcional)'),
    saved.descricao,
  );
  await fireEvent.press(button('Cadastrar pedido'));
  expect(traceability.register).not.toHaveBeenCalled();
  await fireEvent.press(button('Usar este pedido'));
  expect(screen.getByText(saved.codigo)).toBeVisible();
  expect(button('Ler etiqueta')).toBeEnabled();
});

test('reuse rejects a different UID and preserves the registered model in a fresh flow', async () => {
  mockParams = {
    estrategia: 2,
    expectedUid: '53721F76950001',
    registeredModel: 'FEIJU_MODELO_DESCONHECIDO',
  };
  const view = await mount();
  await selectOrder('TCC-002');
  expect(screen.getByText('Feiju · modelo desconhecido')).toBeVisible();
  expect(
    screen.queryByRole('button', {name: 'Escolher modelo'}),
  ).not.toBeOnTheScreen();
  await fireEvent.press(button('Ler etiqueta'));
  await readTag({uid: '04FFFFFFFFFFFF'});
  expect(
    screen.queryByRole('button', {name: 'Vincular'}),
  ).not.toBeOnTheScreen();
  expect(renderedText(view)).toContain('diferente. Leia a etiqueta');
  expect(traceability.register).not.toHaveBeenCalled();
  expect(traceability.activate).not.toHaveBeenCalled();
});

test('UID reuse needs fresh rereading without an old project reference before activation', async () => {
  const uid = '53721F76950001';
  mockParams = {estrategia: 2, expectedUid: uid};
  await mount();
  await selectOrder('TCC-002');
  await fireEvent.press(button('Ler etiqueta'));
  await readTag({uid, ndef: 'urn:nfc-trace:provisioning:old'});
  const next = {
    id: 'next',
    uid,
    pedidoId: 'new-order',
    estrategia: 'UID' as const,
    status: 'REGISTRADA' as const,
    referenciaNdef: null,
    epoca: 2,
  };
  jest.mocked(traceability.register).mockResolvedValueOnce(next);
  await fireEvent.press(button('Vincular'));
  expect(confirmation()).toBeDisabled();
  expect(
    screen.queryByRole('button', {name: 'Ativar etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(traceability.activate).not.toHaveBeenCalled();
  await fireEvent.press(button('Reler etiqueta'));
  await readTag({uid});
  expect(confirmation()).not.toBeChecked();
  await fireEvent.press(confirmation());
  jest
    .mocked(traceability.activate)
    .mockResolvedValueOnce({...next, status: 'ATIVA'});
  await fireEvent.press(button('Ativar etiqueta'));
  expect(traceability.activate).toHaveBeenCalledWith(next, {uid}, true);
  await fireEvent.press(button('Concluir'));
  expect(mockNavigation.popTo).toHaveBeenCalledWith('InformativoEtapas');
});

test('selecting an order permits scanning with an unknown model and activation still requires confirmation', async () => {
  expect(EnumEstrategiasNFC.UID).toBe(2);
  await mount();
  expect(
    screen.queryByRole('button', {name: 'Ler etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(primaryLabels()).toEqual([]);
  await selectOrder('TCC-001');
  expect(button('Ler etiqueta')).toBeEnabled();
  expect(primaryLabels()).toEqual(['Ler etiqueta']);
  await fireEvent.press(button('Ler etiqueta'));
  jest
    .mocked(services.nfc.readPhysicalTag)
    .mockRejectedValueOnce(new Error('Fora de alcance'));
  await fireEvent.press(button('Ler etiqueta'));
  expect(screen.getByText('Fora de alcance')).toBeVisible();
  expect(button('Ler etiqueta')).toBeEnabled();
  const reading = {uid: '53721F76950001', tecnologias: ['iso7816']};
  await readTag(reading);
  jest.mocked(traceability.register).mockResolvedValueOnce({
    id: 'link',
    pedidoId: 'order',
    uid: reading.uid,
    estrategia: 'UID',
    status: 'REGISTRADA',
    referenciaNdef: null,
  });
  expect(primaryLabels()).toEqual(['Vincular']);
  await fireEvent.press(button('Vincular'));
  expect(traceability.register).toHaveBeenCalledWith(
    'TCC-001',
    reading,
    'UID',
    'DESCONHECIDO',
  );
  expect(button('Ativar etiqueta')).toBeDisabled();
  expect(primaryLabels()).toEqual(['Ativar etiqueta']);
  await fireEvent.press(confirmation());
  expect(button('Ativar etiqueta')).toBeEnabled();
  expect(traceability.activate).not.toHaveBeenCalled();
});

test('NDEF presents writing as the next action and cannot activate before verification and explicit confirmation', async () => {
  mockParams = {estrategia: EnumEstrategiasNFC.NDEF_ESTATICO};
  await mount();
  await selectOrder('TEST-NDEF');
  const reading = {uid: '53721F76950001'};
  const link = {
    id: 'ndef-link',
    pedidoId: 'ndef-order',
    uid: reading.uid,
    estrategia: 'NDEF_ESTATICO' as const,
    status: 'REGISTRADA' as const,
    referenciaNdef: 'urn:nfc-trace:provisioning:ndef-link',
    epoca: 1,
  };
  await fireEvent.press(button('Ler etiqueta'));
  await readTag(reading);
  jest.mocked(traceability.register).mockResolvedValueOnce(link);
  await fireEvent.press(button('Vincular'));
  expect(primaryLabels()).toEqual(['Gravar NDEF']);
  expect(confirmation()).toBeDisabled();
  expect(traceability.activate).not.toHaveBeenCalled();
  await fireEvent.press(button('Gravar NDEF'));
  const verified = {...reading, ndef: link.referenciaNdef};
  await readTag(verified, true);
  expect(services.nfc.readPhysicalTag).toHaveBeenLastCalledWith({
    uid: reading.uid,
    reference: link.referenciaNdef,
  });
  expect(primaryLabels()).toEqual(['Ativar etiqueta']);
  expect(button('Ativar etiqueta')).toBeDisabled();
  await fireEvent.press(confirmation());
  jest
    .mocked(traceability.activate)
    .mockResolvedValueOnce({...link, status: 'ATIVA'});
  await fireEvent.press(button('Ativar etiqueta'));
  expect(traceability.activate).toHaveBeenCalledWith(link, verified, true);
  expect(primaryLabels()).toEqual(['Novo vínculo']);
});
