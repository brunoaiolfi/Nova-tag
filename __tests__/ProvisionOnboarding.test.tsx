import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Checkbox, PaperProvider} from 'react-native-paper';
import EtapasProvisionamento from '../src/views/Provisionar/Etapas';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import Leitor from '../src/components/Nfc/Leitor';
import CreateOrderForm from '../src/components/Nfc/CreateOrderForm';
import ModelSelect from '../src/components/Nfc/ModelSelect';
import {traceability} from '../src/infra/traceability/runtime';
import {EnumEstrategiasNFC} from '../src/domain/enums/estrategiasNFC';

let mockParams: {
  estrategia: number;
  expectedUid?: string;
  registeredModel?: string;
};
const mockNavigation = {navigate: jest.fn(), popTo: jest.fn()};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: mockParams}),
  useNavigation: () => mockNavigation,
}));
jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {
    listOrders: jest.fn().mockResolvedValue({itens: [], total: 0}),
    register: jest.fn(),
    activate: jest.fn(),
  },
}));
jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
let tree: TestRenderer.ReactTestRenderer;
beforeEach(() => {
  mockParams = {estrategia: 2};
});
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
});

test('an explicitly confirmed created order becomes the selected persisted order', async () => {
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <EtapasProvisionamento />
      </PaperProvider>,
    );
  });
  await act(async () => tree.root.findByType(OrderSelect).props.onCreate());
  const saved = {
    id: 'server-uuid',
    codigo: 'NOVO-001',
    descricao: 'Caixa nova',
    estado: 'CADASTRADO',
  };
  expect(tree.root.findAllByType(OrderSelect)).toHaveLength(0);
  await act(async () =>
    tree.root.findByType(CreateOrderForm).props.onCreated(saved),
  );
  expect(tree.root.findByType(OrderSelect).props.selected).toEqual(saved);
  expect(traceability.register).not.toHaveBeenCalled();
  expect(button('2. Ler etiqueta do pedido').props.disabled).toBe(false);
});

test('reuse rejects a different UID and preserves the registered model in a fresh flow', async () => {
  mockParams = {
    estrategia: 2,
    expectedUid: '53721F76950001',
    registeredModel: 'FEIJU_MODELO_DESCONHECIDO',
  };
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <EtapasProvisionamento />
      </PaperProvider>,
    );
  });
  await act(async () =>
    tree.root
      .findByType(OrderSelect)
      .props.onSelect({
        id: 'new-order',
        codigo: 'TCC-002',
        estado: 'CADASTRADO',
      }),
  );
  expect(tree.root.findByType(ModelSelect).props).toMatchObject({
    value: mockParams.registeredModel,
    disabled: true,
  });
  await act(async () => button('2. Ler etiqueta do pedido').props.onPress());
  await act(async () =>
    tree.root
      .findByType(Leitor)
      .props.onLeituraRealizada({uid: '04FFFFFFFFFFFF'}),
  );
  expect(button('3. Vincular etiqueta ao pedido')).toBeUndefined();
  expect(JSON.stringify(tree.toJSON())).toContain('diferente. Leia a etiqueta');
  expect(traceability.register).not.toHaveBeenCalled();
  expect(traceability.activate).not.toHaveBeenCalled();
});

test('UID reuse needs fresh rereading without an old project reference before activation', async () => {
  const uid = '53721F76950001';
  mockParams = {estrategia: 2, expectedUid: uid};
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <EtapasProvisionamento />
      </PaperProvider>,
    );
  });
  await act(async () =>
    tree.root
      .findByType(OrderSelect)
      .props.onSelect({
        id: 'new-order',
        codigo: 'TCC-002',
        estado: 'CADASTRADO',
      }),
  );
  await act(async () => button('2. Ler etiqueta do pedido').props.onPress());
  await act(async () =>
    tree.root
      .findByType(Leitor)
      .props.onLeituraRealizada({uid, ndef: 'urn:nfc-trace:provisioning:old'}),
  );
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
  await act(async () =>
    button('3. Vincular etiqueta ao pedido').props.onPress(),
  );
  await act(async () => tree.root.findByType(Checkbox.Item).props.onPress());
  expect(button('4. Ativar etiqueta').props.disabled).toBe(true);
  await act(async () =>
    button('Reler etiqueta após configuração').props.onPress(),
  );
  await act(async () =>
    tree.root.findByType(Leitor).props.onLeituraRealizada({uid}),
  );
  expect(tree.root.findByType(Checkbox.Item).props.status).toBe('unchecked');
  await act(async () => tree.root.findByType(Checkbox.Item).props.onPress());
  jest
    .mocked(traceability.activate)
    .mockResolvedValueOnce({...next, status: 'ATIVA'});
  await act(async () => button('4. Ativar etiqueta').props.onPress());
  expect(traceability.activate).toHaveBeenCalledWith(next, {uid}, true);
  await act(async () => button('Concluir reutilização').props.onPress());
  expect(mockNavigation.popTo).toHaveBeenCalledWith('InformativoEtapas');
});

test('selecting an order permits scanning with an unknown model and activation still requires confirmation', async () => {
  expect(EnumEstrategiasNFC.UID).toBe(2);
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <EtapasProvisionamento />
      </PaperProvider>,
    );
  });
  expect(button('2. Ler etiqueta do pedido')).toBeUndefined();
  const order = {
    id: 'order',
    codigo: 'TCC-001',
    descricao: null,
    estado: 'CADASTRADO',
  };
  await act(async () => {
    tree.root.findByType(OrderSelect).props.onSelect(order);
  });
  expect(button('2. Ler etiqueta do pedido').props.disabled).toBe(false);
  await act(async () => {
    button('2. Ler etiqueta do pedido').props.onPress();
  });
  await act(async () => {
    tree.root.findByType(Leitor).props.onErroLeitura('Fora de alcance');
  });
  expect(tree.root.findAllByType(Leitor)).toHaveLength(1);
  const reading = {uid: '53721F76950001', tecnologias: ['iso7816']};
  await act(async () => {
    tree.root
      .findByType(Leitor)
      .props.onLeituraRealizada(reading, '2026-10-05T12:00:00.000Z');
  });
  jest.mocked(traceability.register).mockResolvedValueOnce({
    id: 'link',
    pedidoId: order.id,
    uid: reading.uid,
    estrategia: 'UID',
    status: 'REGISTRADA',
    referenciaNdef: null,
  });
  await act(async () => {
    button('3. Vincular etiqueta ao pedido').props.onPress();
  });
  expect(traceability.register).toHaveBeenCalledWith(
    'TCC-001',
    reading,
    'UID',
    'DESCONHECIDO',
  );
  expect(button('4. Ativar etiqueta').props.disabled).toBe(true);
  await act(async () => {
    tree.root.findByType(Checkbox.Item).props.onPress();
  });
  expect(button('4. Ativar etiqueta').props.disabled).toBe(false);
  expect(traceability.activate).not.toHaveBeenCalled();
});
