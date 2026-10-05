import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  List,
  PaperProvider,
  SegmentedButtons,
  TouchableRipple,
} from 'react-native-paper';
import {ActionButton as Button, OrderJourney} from '../src/components/Tracking';
import Historico, {HistoryItem} from '../src/views/Historico';
import OrderSelect from '../src/components/Nfc/OrderSelect';
import type {
  HistoryEntry,
  Reading,
} from '../src/appplication/traceability/workflow';
import {traceability} from '../src/infra/traceability/runtime';

let mockParams: {reading?: Reading} | undefined;
const mockNavigation = {setParams: jest.fn()};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: mockParams}),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({state: {status: 'authenticated'}}),
}));
jest.mock('../src/infra/traceability/runtime', () => ({
  traceability: {
    listOrders: jest.fn(),
    order: jest.fn(),
    history: jest.fn(),
    resolveProvisioning: jest.fn(),
  },
}));
const order = {
  id: 'order',
  codigo: 'TCC-001',
  descricao: 'Teste de histórico',
  estado: 'ENTREGUE',
  expedido: true,
};
const link = {
  id: 'link',
  pedidoId: 'order',
  uid: '53721F76950001',
  estrategia: 'UID' as const,
  status: 'ATIVA' as const,
  referenciaNdef: null,
  epoca: 1,
};
const entry: HistoryEntry = {
  id: 'capture',
  tipo: 'COLETA',
  origem: 'CAPTURA',
  provisionamentoId: link.id,
  ocorridoEm: '2026-10-05T12:00:00.000Z',
  recebidoEm: '2026-10-05T13:00:00.000Z',
  autoria: null,
  decisao: {
    autorizada: false,
    motivo: 'SEQUENCIA_INVALIDA',
    classificacao: 'SUSPEITO',
    avisos: ['UID_DIVERGENTE'],
    alterouEstado: false,
    estadoAnterior: 'ENTREGUE',
    estadoResultante: 'ENTREGUE',
  },
};
let tree: TestRenderer.ReactTestRenderer;
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
async function render() {
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Historico />
      </PaperProvider>,
    );
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = undefined;
  jest
    .mocked(traceability.listOrders)
    .mockResolvedValue({itens: [order], total: 1});
  jest.mocked(traceability.order).mockResolvedValue(order);
  jest.mocked(traceability.resolveProvisioning).mockResolvedValue(link);
  jest
    .mocked(traceability.history)
    .mockResolvedValue({itens: [entry], proximaPagina: null, totalDoPedido: 1});
});
afterEach(async () => {
  await act(async () => tree?.unmount());
});

test('order selection shows stored rejection, current state and separate server/device times', async () => {
  await render();
  expect(tree.root.findByType(OrderSelect).props.purpose).toBe('history');
  await act(async () => {
    tree.root.findByType(OrderSelect).props.onSelect(order);
  });
  expect(traceability.history).toHaveBeenCalledWith(order.id, 1, undefined);
  expect(tree.root.findByType(OrderJourney).props.order).toEqual(order);
  await act(async () =>
    tree.root
      .findAllByType(List.Accordion)
      .find(item => item.props.title === 'Detalhes do registro')!
      .findByType(TouchableRipple)
      .props.onPress(),
  );
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain(order.codigo);
  expect(text).toContain('Entregue');
  expect(text).toContain('Operação rejeitada · pedido não alterado');
  expect(text).toContain('Recebido pelo servidor:');
  expect(text).toContain('Horário declarado pelo aparelho');
  expect(text).toContain('Leitura suspeita');
});

test('a scanned NDEF tag opens its exact provisioning history and can expand to the order', async () => {
  mockParams = {
    reading: {
      uid: '04FFFFFFFFFFFF',
      ndef: 'urn:nfc-trace:provisioning:00000000-0000-4000-8000-000000000001',
    },
  };
  jest
    .mocked(traceability.resolveProvisioning)
    .mockResolvedValue({...link, estrategia: 'NDEF_ESTATICO'});
  await render();
  expect(traceability.resolveProvisioning).toHaveBeenCalledWith(
    mockParams.reading,
  );
  expect(traceability.history).toHaveBeenCalledWith(order.id, 1, link.id);
  expect(JSON.stringify(tree.toJSON())).toContain('o UID lido é diferente');
  await act(async () => {
    tree.root.findByType(SegmentedButtons).props.onValueChange('pedido');
  });
  expect(traceability.history).toHaveBeenLastCalledWith(order.id, 1, undefined);
  expect(mockNavigation.setParams).toHaveBeenCalledWith({reading: undefined});
});

test('load more keeps previous entries and refresh starts from the first page', async () => {
  mockParams = {reading: {uid: link.uid}};
  jest.mocked(traceability.history).mockResolvedValueOnce({
    itens: [entry],
    proximaPagina: 2,
    totalDoPedido: 21,
  });
  await render();
  jest.mocked(traceability.history).mockResolvedValueOnce({
    itens: [{...entry, id: 'second', tipo: 'ENTREGA'}],
    proximaPagina: null,
    totalDoPedido: 21,
  });
  await act(async () => {
    button('Carregar mais registros').props.onPress();
  });
  expect(tree.root.findAllByType(HistoryItem)).toHaveLength(2);
  expect(traceability.history).toHaveBeenLastCalledWith(order.id, 2, link.id);
  await act(async () => {
    button('Atualizar histórico').props.onPress();
  });
  expect(traceability.history).toHaveBeenLastCalledWith(order.id, 1, link.id);
});

test('a lookup abandoned for NFC cannot update the screen or issue a stale history request', async () => {
  await render();
  let finish!: (value: typeof order) => void;
  jest.mocked(traceability.order).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await act(async () => {
    tree.root.findByType(OrderSelect).props.onSelect(order);
  });
  await act(async () => {
    button('Ler outra etiqueta').props.onPress();
  });
  await act(async () => {
    finish(order);
  });
  // Leaving for NFC invalidates the previous request, even if it resolves later.
  expect(tree.root.findAllByType(HistoryItem)).toHaveLength(0);
  expect(traceability.history).not.toHaveBeenCalled();
});

test('a network failure offers retry without losing the selected order', async () => {
  await render();
  jest
    .mocked(traceability.order)
    .mockRejectedValueOnce(new Error('Sem conexão'));
  await act(async () => {
    tree.root.findByType(OrderSelect).props.onSelect(order);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Sem conexão');
  await act(async () => {
    button('Tentar novamente').props.onPress();
  });
  expect(tree.root.findAllByType(HistoryItem)).toHaveLength(1);
  expect(traceability.order).toHaveBeenCalledTimes(2);
});

test('a rejected delivery does not advance the journey and delivery does not require expedition', async () => {
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, estado: 'CADASTRADO', expedido: false});
  jest
    .mocked(traceability.history)
    .mockResolvedValue({
      itens: [
        {
          ...entry,
          tipo: 'ENTREGA',
          decisao: {
            ...entry.decisao,
            estadoAnterior: 'CADASTRADO',
            estadoResultante: 'CADASTRADO',
          },
        },
      ],
      proximaPagina: null,
      totalDoPedido: 1,
    });
  await render();
  await act(async () =>
    tree.root.findByType(OrderSelect).props.onSelect(order),
  );
  expect(tree.root.findByType(OrderJourney).props.order.estado).toBe(
    'CADASTRADO',
  );
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Entrega: ainda não registrada',
  );
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, expedido: false});
  await act(async () => button('Atualizar histórico').props.onPress());
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Entrega: etapa atual');
  expect(text).not.toContain('Saída para entrega registrada');
});
