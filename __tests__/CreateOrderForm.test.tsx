import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, Text, TextInput} from 'react-native-paper';
import {ActionButton} from '../src/components/Tracking';
import CreateOrderForm from '../src/components/Nfc/CreateOrderForm';
import {traceability} from '../src/infra/traceability/runtime';
import {SessionError} from '../src/domain/auth/types';

let mockRole = 'ADMINISTRADOR';
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {
      status: 'authenticated',
      session: {user: {id: 'admin', perfil: mockRole}},
    },
  }),
}));
jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {createOrder: jest.fn()},
}));
const order = {
  id: 'server-id',
  codigo: 'TCC-001',
  descricao: 'Caixa',
  estado: 'CADASTRADO',
};
let tree: TestRenderer.ReactTestRenderer;
const onCreated = jest.fn();
const onCancel = jest.fn();
const button = (label: string) =>
  tree.root
    .findAllByType(ActionButton)
    .find(item => item.props.children === label)!;
const text = () =>
  tree.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
async function mount() {
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <CreateOrderForm onCreated={onCreated} onCancel={onCancel} />
      </PaperProvider>,
    );
  });
}
async function fill() {
  await act(async () => {
    tree.root.findAllByType(TextInput)[0].props.onChangeText('TCC-001');
    tree.root.findAllByType(TextInput)[1].props.onChangeText('Caixa');
  });
}
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
  mockRole = 'ADMINISTRADOR';
});

test('saved order remains visible and is selected only after explicit continuation', async () => {
  jest
    .mocked(traceability.createOrder)
    .mockResolvedValue({order, recovered: false});
  await mount();
  expect(button('Cadastrar pedido').props.disabled).toBe(true);
  await fill();
  await act(async () => {
    button('Cadastrar pedido').props.onPress();
  });
  expect(traceability.createOrder).toHaveBeenCalledWith(
    {codigo: 'TCC-001', descricao: 'Caixa'},
    'admin',
  );
  expect(text()).toContain('TCC-001');
  expect(onCreated).not.toHaveBeenCalled();
  await act(async () => {
    button('Usar este pedido').props.onPress();
  });
  expect(onCreated).toHaveBeenCalledWith(order);
});

test('duplicate code keeps fields for correction and never selects an order', async () => {
  jest
    .mocked(traceability.createOrder)
    .mockRejectedValue(
      new SessionError('CODIGO_PEDIDO_DUPLICADO', 'Duplicate', 409),
    );
  await mount();
  await fill();
  await act(async () => {
    button('Cadastrar pedido').props.onPress();
  });
  expect(text()).toContain('Esse código já existe');
  expect(tree.root.findAllByType(TextInput)[0].props.value).toBe('TCC-001');
  expect(onCreated).not.toHaveBeenCalled();
});

test('rapid repeated taps send one command and unmount ignores its late result', async () => {
  let resolve!: (value: {order: typeof order; recovered: boolean}) => void;
  jest.mocked(traceability.createOrder).mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  await mount();
  await fill();
  const submit = button('Cadastrar pedido').props.onPress;
  await act(async () => {
    submit();
    submit();
  });
  expect(traceability.createOrder).toHaveBeenCalledTimes(1);
  await act(async () => {
    tree.unmount();
    resolve({order, recovered: false});
  });
  expect(onCreated).not.toHaveBeenCalled();
});

test('recovered response is presented as a lookup, without claiming a new creation', async () => {
  jest
    .mocked(traceability.createOrder)
    .mockResolvedValue({order, recovered: true});
  await mount();
  await fill();
  await act(async () => {
    button('Cadastrar pedido').props.onPress();
  });
  expect(text()).toContain('encontramos esse código e descrição no servidor');
});

test('operator cannot submit a creation even when its handler is called directly', async () => {
  mockRole = 'OPERADOR';
  await mount();
  await fill();
  expect(button('Cadastrar pedido').props.disabled).toBe(true);
  await act(async () => {
    button('Cadastrar pedido').props.onPress();
  });
  expect(traceability.createOrder).not.toHaveBeenCalled();
});
