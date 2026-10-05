import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, RadioButton, Searchbar} from 'react-native-paper';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import {traceability} from '../src/infra/traceability/runtime';
import type {OrderPage} from '../src/appplication/traceability/workflow';

jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {listOrders: jest.fn()},
}));
const list = jest.mocked(traceability.listOrders);
let tree: TestRenderer.ReactTestRenderer;
const order = {
  id: 'one',
  codigo: 'TCC-001',
  descricao: 'Volume de teste',
  estado: 'CADASTRADO',
};
async function render(purpose: 'provisioning' | 'history' = 'provisioning') {
  const select = jest.fn();
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <OrderSelect onSelect={select} disabled={false} purpose={purpose} />
      </PaperProvider>,
    );
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  return select;
}
beforeEach(() => {
  jest.useFakeTimers();
  list.mockReset();
});
afterEach(async () => {
  await act(async () => tree?.unmount());
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
  const select = await render();
  const items = tree.root.findAllByType(RadioButton.Item);
  expect(items[1].props.disabled).toBe(true);
  await act(async () => {
    items[0].props.onPress();
  });
  expect(select).toHaveBeenCalledWith(order);
});

test('offers additional pages even when the initial orders are ineligible', async () => {
  list
    .mockResolvedValueOnce({itens: [{...order, estado: 'ENTREGUE'}], total: 11})
    .mockResolvedValueOnce({itens: [{...order, id: 'last'}], total: 11});
  await render();
  await act(async () => {
    tree.root
      .findAllByType(Button)
      .find(item => item.props.children === 'Carregar mais pedidos')!
      .props.onPress();
  });
  expect(list).toHaveBeenLastCalledWith('', 2);
  expect(tree.root.findAllByType(RadioButton.Item)).toHaveLength(2);
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
  await render();
  await act(async () => {
    tree.root.findByType(Searchbar).props.onChangeText('NEW');
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  await act(async () => {
    finish({itens: [order], total: 1});
  });
  expect(tree.root.findAllByType(RadioButton.Item)[0].props.label).toContain(
    'TCC-NEW',
  );
});

test('history allows selecting delivered orders while provisioning does not', async () => {
  const delivered = {...order, estado: 'ENTREGUE'};
  list.mockResolvedValueOnce({itens: [delivered], total: 1});
  const select = await render('history');
  const option = tree.root.findByType(RadioButton.Item);
  expect(option.props.disabled).toBe(false);
  await act(async () => {
    option.props.onPress();
  });
  expect(select).toHaveBeenCalledWith(delivered);
});
