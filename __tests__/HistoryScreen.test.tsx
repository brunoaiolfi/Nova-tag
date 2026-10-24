import {createTestServices, withServices} from '../test-support/app-services';
import {renderedText} from '../test-support/rendered-text';
import React from 'react';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';

import Historico from '../src/views/Historico';
import type {HistoryEntry} from '../src/appplication/traceability/contracts/history.types';
import type {Reading} from '../src/domain/traceability/reading';

let mockParams: {reading?: Reading} | undefined;
const mockNavigation = {setParams: jest.fn(), navigate: jest.fn()};
let mockRole = 'ADMINISTRADOR';
jest.mock('@react-navigation/native', () => ({
  NavigationContext: jest.requireActual('@react-navigation/native')
    .NavigationContext,
  useRoute: () => ({params: mockParams}),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {status: 'authenticated', session: {user: {perfil: mockRole}}},
  }),
}));

const services = createTestServices({
  traceability: {
    listOrders: jest.fn(),
    order: jest.fn(),
    history: jest.fn(),
    resolveProvisioning: jest.fn(),
  },
});
const {traceability} = services;

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
let tree: RenderResult;
const button = (label: string) => screen.queryByRole('button', {name: label});
async function render() {
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <Historico />
      </PaperProvider>,
      services,
    ),
  );
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = undefined;
  mockRole = 'ADMINISTRADOR';
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
  await act(async () => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

test('order selection shows stored rejection, current state and separate server/device times', async () => {
  await render();

  await selectOrder();
  expect(traceability.history).toHaveBeenCalledWith(order.id, 1, undefined);
  expect(renderedText(tree)).toContain(order.descricao);
  await fireEvent.press(screen.getByText('Detalhes do registro'));
  const text = renderedText(tree);
  expect(text).toContain(order.codigo);
  expect(text).toContain('Entregue');
  expect(text).toContain('Operação rejeitada · pedido não alterado');
  expect(text).toContain('Recebido pelo servidor:');
  expect(text).toContain('Horário declarado pelo aparelho');
  expect(text).toContain('Leitura suspeita');
});

test('late SDM history distinguishes authentication, policy and absence of authorized movement', async () => {
  jest.mocked(traceability.history).mockResolvedValue({
    itens: [
      {
        ...entry,
        decisao: {
          ...entry.decisao,
          motivo: 'SDM_REGISTRO_TARDIO',
          classificacao: 'REGULAR',
          avisos: [],
          sdm: {
            perfil: 'nfc-trace.sdm.encrypted-picc.v1',
            politica: 'REGISTRO_TARDIO',
            epoca: 2,
            autenticada: true,
            previamenteUtilizada: false,
            contador: 5,
            maiorContadorAnterior: 10,
            temporalidade: 'TARDIA',
          },
        },
      },
    ],
    proximaPagina: null,
    totalDoPedido: 1,
  });
  await render();
  await selectOrder();
  const text = renderedText(tree);
  expect(text).not.toContain('Evidência autenticada pelo servidor');
  await expandDetails('Validação NFC');
  const expanded = renderedText(tree);
  expect(expanded).toContain('Evidência autenticada pelo servidor');
  expect(expanded).toContain('sem movimentação automática');
  expect(text).toContain('Leitura tardia preservada · sem movimentação');
  expect(text).not.toContain('Operação autorizada');
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
  expect(renderedText(tree)).toContain('o UID lido é diferente');

  await fireEvent.press(screen.getByText('Pedido completo'));

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

  await fireEvent.press(
    screen.getByRole('button', {name: 'Carregar mais registros'}),
  );

  expect(
    screen.queryAllByRole('header', {name: /^(Coleta|Entrega)$/}),
  ).toHaveLength(2);
  expect(traceability.history).toHaveBeenLastCalledWith(order.id, 2, link.id);

  await fireEvent.press(screen.getByRole('button', {name: 'Atualizar'}));

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
  await selectOrder();

  await fireEvent.press(
    screen.getByRole('button', {name: 'Ler outra etiqueta'}),
  );

  await act(async () => {
    finish(order);
  });
  // Leaving for NFC invalidates the previous request, even if it resolves later.
  expect(
    screen.queryAllByRole('header', {name: /^(Coleta|Entrega)$/}),
  ).toHaveLength(0);
  expect(traceability.history).not.toHaveBeenCalled();
});

test('a network failure offers retry without losing the selected order', async () => {
  await render();
  jest
    .mocked(traceability.order)
    .mockRejectedValueOnce(new Error('Sem conexão'));
  await selectOrder();
  expect(renderedText(tree)).toContain('Sem conexão');

  await fireEvent.press(screen.getByRole('button', {name: 'Tentar novamente'}));

  expect(
    screen.queryAllByRole('header', {name: /^(Coleta|Entrega)$/}),
  ).toHaveLength(1);
  expect(traceability.order).toHaveBeenCalledTimes(2);
});

test('a rejected delivery does not advance the journey and delivery does not require expedition', async () => {
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, estado: 'CADASTRADO', expedido: false});
  jest.mocked(traceability.history).mockResolvedValue({
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
  await selectOrder();
  expect(renderedText(tree)).toContain('Cadastro: etapa atual');
  expect(renderedText(tree)).toContain('Entrega: ainda não registrada');
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, expedido: false});
  await fireEvent.press(screen.getByRole('button', {name: 'Atualizar'}));
  const text = renderedText(tree);
  expect(text).toContain('Entrega: etapa atual');
  expect(text).not.toContain('Saída para entrega registrada');
});

async function expandTag() {
  await fireEvent.press(screen.getByText('Sobre a etiqueta deste pedido'));
}
test('the selected order exposes its current link for administrative management', async () => {
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, provisionamentoVigente: link});
  await render();
  await selectOrder();
  await expandTag();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Gerenciar vínculo'}),
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith('Provisionar', {
    screen: 'Gerenciar',
    params: {provisioningId: link.id},
  });
});
test('management stays unavailable to operators even when order details expose the link', async () => {
  mockRole = 'OPERADOR';
  jest
    .mocked(traceability.order)
    .mockResolvedValue({...order, provisionamentoVigente: link});
  await render();
  await selectOrder();
  await expandTag();
  expect(button('Gerenciar vínculo')).toBeNull();
});
test('a scanned old NDEF epoch stays selected when the order has a newer current link', async () => {
  mockParams = {
    reading: {
      uid: link.uid,
      ndef: 'urn:nfc-trace:provisioning:00000000-0000-4000-8000-000000000001',
    },
  };
  jest.mocked(traceability.order).mockResolvedValue({
    ...order,
    provisionamentoVigente: {...link, id: 'new-id', epoca: 2},
  });
  await render();
  await expandTag();
  await fireEvent.press(
    screen.getByRole('button', {name: 'Gerenciar vínculo'}),
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith('Provisionar', {
    screen: 'Gerenciar',
    params: {provisioningId: link.id},
  });
});

test('pending logistics shows prerequisites and deadline instead of rejection', async () => {
  jest.mocked(traceability.history).mockResolvedValue({
    itens: [
      {
        ...entry,
        tipo: 'RECEBIMENTO',
        decisao: {
          ...entry.decisao,
          classificacao: 'REGULAR',
          avisos: [],
          status: 'PENDENTE',
          revisao: 1,
          motivo: 'AGUARDANDO_ANTECEDENTE',
          dependencias: [{tipo: 'COLETA', estadoNecessario: 'COLETADO'}],
          expiraEm: '2026-10-07T21:00:00Z',
        },
      },
    ],
    proximaPagina: null,
    totalDoPedido: 1,
  });
  await render();
  await selectOrder();
  const text = renderedText(tree);
  expect(text).toContain('Aguardando etapa anterior · salva no servidor');
  expect(text).toContain('Aguardando:');
  expect(text).toContain('Coleta');
  expect(text).toContain('Prazo:');
  expect(text).not.toContain('Operação rejeitada · pedido não alterado');
});

test('history displays all decision revisions with separate evaluation and receipt times', async () => {
  const pending = {
    ...entry.decisao,
    motivo: 'AGUARDANDO_ANTECEDENTE',
    revisao: 1,
    status: 'PENDENTE' as const,
    avaliadaEm: '2026-10-05T13:00:00Z',
  };
  const accepted = {
    ...entry.decisao,
    autorizada: true,
    motivo: 'ACEITA',
    revisao: 2,
    status: 'AUTORIZADA' as const,
    avaliadaEm: '2026-10-05T13:30:00Z',
  };
  jest.mocked(traceability.history).mockResolvedValue({
    itens: [
      {...entry, decisao: accepted, historicoDecisoes: [pending, accepted]},
    ],
    proximaPagina: null,
    totalDoPedido: 1,
  });
  await render();
  await selectOrder();
  const text = renderedText(tree);
  expect(text).toContain('Evolução da decisão');
  expect(text).not.toContain('Decisão ');
  await expandDetails('Evolução da decisão');
  expect(renderedText(tree)).toContain('Decisão ');
  expect(text).toContain('Operação autorizada');
  expect(text).toContain('Recebido pelo servidor:');
});

async function expandDetails(title: string) {
  await fireEvent.press(screen.getByRole('button', {name: title}));
}

async function selectOrder() {
  const control = await screen.findByRole('button', {name: /TCC-001/});
  expect(control).toBeEnabled();
  await fireEvent.press(control);
}
