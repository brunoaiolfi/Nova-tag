import React from 'react';
import {
  act,
  render as renderUI,
  screen,
  userEvent,
  fireEvent,
} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {createTestServices, withServices} from '../test-support/app-services';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import type {OrderPage} from '../src/appplication/traceability/contracts/order.types';

let mockListData: unknown;
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const ReactRuntime = require('react');
  const ActualList = jest.requireActual(
    'react-native/Libraries/Lists/FlatList',
  ).default;
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockListData = props.data;
      return ReactRuntime.createElement(ActualList, props);
    },
  };
});
const services = createTestServices({traceability: {listOrders: jest.fn()}});
const list = jest.mocked(services.traceability.listOrders);
const order = {
  id: 'one',
  codigo: 'TCC-001',
  descricao: 'Volume de teste',
  estado: 'CADASTRADO',
};
const user = () => userEvent.setup({advanceTimers: jest.advanceTimersByTime});
async function mount(purpose: 'provisioning' | 'history' = 'provisioning') {
  const select = jest.fn();
  await renderUI(
    withServices(
      <PaperProvider>
        <OrderSelect onSelect={select} disabled={false} purpose={purpose} />
      </PaperProvider>,
      services,
    ),
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  return select;
}
beforeEach(() => {
  jest.useFakeTimers();
  list.mockReset();
});
afterEach(() => {
  jest.useRealTimers();
});

test('selects real orders and disables those beyond CADASTRADO', async () => {
  list.mockResolvedValueOnce({
    itens: [
      order,
      {...order, id: 'two', codigo: 'TCC-002', estado: 'ENTREGUE'},
    ],
    total: 2,
  });
  const select = await mount();
  expect(screen.getByRole('button', {name: /TCC-002/})).toBeDisabled();
  expect(
    screen.getByText('Novo vínculo indisponível neste estado'),
  ).toBeVisible();
  await user().press(screen.getByRole('button', {name: /TCC-002/}));
  expect(select).not.toHaveBeenCalled();
  await user().press(screen.getByRole('button', {name: /TCC-001/}));
  expect(select).toHaveBeenCalledWith(order);
});

test('long order codes keep their full accessible identity inside separated rounded cards on a light surface', async () => {
  const longCode = 'DEMO-A1B2C3D4-1111-4222-8333-123456789ABC';
  list.mockResolvedValueOnce({itens: [{...order, codigo: longCode}], total: 1});
  const select = await mount();
  expect(screen.getByTestId('order-search-results')).toHaveStyle({
    backgroundColor: 'white',
  });
  const card = screen.getByRole('button', {
    name: longCode + ' · Volume de teste · Cadastrado',
  });
  expect(card).toHaveStyle({
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  });
  expect(screen.getByText(longCode)).toBeVisible();
  expect(screen.getByText('1 pedido encontrado')).toBeVisible();
  await user().press(card);
  expect(select).toHaveBeenCalledWith({...order, codigo: longCode});
});
test('offers additional pages even when the initial orders are ineligible', async () => {
  list
    .mockResolvedValueOnce({itens: [{...order, estado: 'ENTREGUE'}], total: 11})
    .mockResolvedValueOnce({itens: [{...order, id: 'last'}], total: 11});
  await mount();
  await user().press(
    screen.getByRole('button', {name: 'Carregar mais pedidos'}),
  );
  expect(list).toHaveBeenLastCalledWith('', 2);
  expect(screen.getAllByRole('button', {name: /TCC-001/})).toHaveLength(2);
});
test('a stale search response cannot replace the current search results', async () => {
  let finish!: (page: OrderPage) => void;
  list
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({itens: [{...order, codigo: 'TCC-NEW'}], total: 1});
  await mount();
  await fireEvent.changeText(
    screen.getByPlaceholderText('Buscar pedido'),
    'NEW',
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  await act(async () => {
    finish({itens: [order], total: 1});
  });
  expect(screen.getByRole('button', {name: /TCC-NEW/})).toBeVisible();
  expect(screen.queryByRole('button', {name: /TCC-001/})).not.toBeOnTheScreen();
});
test('history allows selecting delivered orders while provisioning does not', async () => {
  const delivered = {...order, estado: 'ENTREGUE'};
  list.mockResolvedValueOnce({itens: [delivered], total: 1});
  const select = await mount('history');
  expect(screen.getByRole('button', {name: /TCC-001/})).toBeEnabled();
  expect(
    screen.queryByText('Novo vínculo indisponível neste estado'),
  ).not.toBeOnTheScreen();
  await user().press(screen.getByRole('button', {name: /TCC-001/}));
  expect(select).toHaveBeenCalledWith(delivered);
});
test('a large loaded result keeps all data while mounting only a window of order rows', async () => {
  const orders = Array.from({length: 500}, (_, index) => ({
    ...order,
    id: String(index),
  }));
  list.mockResolvedValueOnce({itens: orders, total: 500});
  await mount();
  expect(mockListData).toHaveLength(500);
  const rows = screen.getAllByRole('button', {name: /TCC-001/});
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThan(500);
  for (
    let parent = screen.getByTestId('order-search-results').parent;
    parent;
    parent = parent.parent
  )
    expect(parent.type).not.toBe('RCTScrollView');
});
