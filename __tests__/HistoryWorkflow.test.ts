import {
  Api,
  HistoryEntry,
  TraceabilityWorkflow,
} from '../src/appplication/traceability/workflow';

const entry = (id: string, link: string): HistoryEntry => ({
  id,
  provisionamentoId: link,
  tipo: 'COLETA',
  origem: 'CAPTURA',
  autoria: null,
  ocorridoEm: '2026-10-05T12:00:00.000Z',
  recebidoEm: '2026-10-05T13:00:00.000Z',
  decisao: {
    autorizada: true,
    motivo: 'ACEITA',
    classificacao: 'REGULAR',
    avisos: [],
    alterouEstado: true,
    estadoAnterior: 'CADASTRADO',
    estadoResultante: 'COLETADO',
  },
});
const request = jest.fn();
const workflow = new TraceabilityWorkflow({request} as Api);
beforeEach(() => request.mockReset());

test('keeps the received order and rejected attempts when consulting the whole order', async () => {
  const first = {
    ...entry('first', 'old'),
    ocorridoEm: '2026-10-05T14:00:00.000Z',
  };
  const rejected = {
    ...entry('second', 'new'),
    decisao: {
      ...entry('second', 'new').decisao,
      autorizada: false,
      motivo: 'SEQUENCIA_INVALIDA',
    },
  };
  request.mockResolvedValueOnce({itens: [first, rejected], total: 21});
  const result = await workflow.history('order');
  expect(result.itens).toEqual([first, rejected]);
  expect(result.proximaPagina).toBe(2);
  expect(result.totalDoPedido).toBe(21);
  expect(request).toHaveBeenCalledWith(
    '/pedidos/order/eventos?pagina=1&limite=20',
  );
});

test('skips unrelated epochs without mixing their events into the selected tag link', async () => {
  const match = entry('mine', 'selected');
  request
    .mockResolvedValueOnce({itens: [entry('old', 'another')], total: 41})
    .mockResolvedValueOnce({itens: [entry('also-old', 'another')], total: 41})
    .mockResolvedValueOnce({
      itens: [match, entry('other', 'another')],
      total: 41,
    });
  expect(await workflow.history('order', 1, 'selected')).toEqual({
    itens: [match],
    proximaPagina: null,
    totalDoPedido: 41,
  });
  expect(request.mock.calls.map(call => call[0])).toEqual(
    [1, 2, 3].map(page => `/pedidos/order/eventos?pagina=${page}&limite=20`),
  );
});

test('a link without matching records finishes with an empty result', async () => {
  request.mockResolvedValueOnce({itens: [entry('other', 'another')], total: 1});
  expect((await workflow.history('order', 1, 'selected')).itens).toEqual([]);
});
