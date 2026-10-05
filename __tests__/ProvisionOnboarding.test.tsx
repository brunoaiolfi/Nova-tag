import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Button, Checkbox, PaperProvider} from 'react-native-paper';
import EtapasProvisionamento from '../src/views/Provisionar/Etapas';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import Leitor from '../src/components/Nfc/Leitor';
import {traceability} from '../src/infra/traceability/runtime';
import {EnumEstrategiasNFC} from '../src/domain/enums/estrategiasNFC';

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: {estrategia: 2}}),
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
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
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
  expect(button('2. Ler etiqueta do pedido').props.disabled).toBe(true);
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
  jest
    .mocked(traceability.register)
    .mockResolvedValueOnce({
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
