import {createTestServices, withServices} from '../test-support/app-services';
import React from 'react';
import {act, render, screen, userEvent} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import CreateOrderForm from '../src/components/Nfc/CreateOrderForm';
import {SessionError} from '../src/appplication/auth/session-error';

let mockRole = 'ADMINISTRADOR';
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {
      status: 'authenticated',
      session: {user: {id: 'admin', perfil: mockRole}},
    },
  }),
}));
const services = createTestServices({traceability: {createOrder: jest.fn()}});
const {traceability} = services;
const order = {
  id: 'server-id',
  codigo: 'TCC-001',
  descricao: 'Caixa',
  estado: 'CADASTRADO',
};
let view: RenderResult;
const onCreated = jest.fn();
const onCancel = jest.fn();
const button = (name: string) => screen.getByRole('button', {name});
async function mount() {
  view = await render(
    withServices(
      <PaperProvider>
        <CreateOrderForm onCreated={onCreated} onCancel={onCancel} />
      </PaperProvider>,
      services,
    ),
  );
}
async function fill() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Código do pedido'), 'TCC-001');
  await user.type(screen.getByLabelText('Descrição (opcional)'), 'Caixa');
}
afterEach(() => {
  jest.clearAllMocks();
  mockRole = 'ADMINISTRADOR';
});

test('saved order remains visible and is selected only after explicit continuation', async () => {
  jest
    .mocked(traceability.createOrder)
    .mockResolvedValue({order, recovered: false});
  await mount();
  expect(button('Cadastrar pedido')).toBeDisabled();
  await fill();
  await userEvent.press(button('Cadastrar pedido'));
  expect(traceability.createOrder).toHaveBeenCalledWith(
    {codigo: 'TCC-001', descricao: 'Caixa'},
    'admin',
  );
  expect(screen.getByText('TCC-001')).toBeVisible();
  expect(onCreated).not.toHaveBeenCalled();
  await userEvent.press(button('Usar este pedido'));
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
  await userEvent.press(button('Cadastrar pedido'));
  expect(screen.getByText(/Esse código já existe/)).toBeVisible();
  expect(screen.getByLabelText('Código do pedido')).toHaveDisplayValue(
    'TCC-001',
  );
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
  await userEvent.press(button('Cadastrar pedido'));
  expect(button('Cadastrar pedido')).toBeBusy();
  await userEvent.press(button('Cadastrar pedido'));
  expect(traceability.createOrder).toHaveBeenCalledTimes(1);
  await view.unmount();
  await act(async () => {
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
  await userEvent.press(button('Cadastrar pedido'));
  expect(
    screen.getByText(/encontramos esse código e descrição no servidor/),
  ).toBeVisible();
});

test('operator cannot submit a creation through a disabled control', async () => {
  mockRole = 'OPERADOR';
  await mount();
  expect(screen.getByText(/Somente um Administrador/)).toBeVisible();
  expect(button('Cadastrar pedido')).toBeDisabled();
  await userEvent.press(button('Cadastrar pedido'));
  expect(traceability.createOrder).not.toHaveBeenCalled();
});
