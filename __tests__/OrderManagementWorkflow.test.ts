import {
  Api,
  Provisioning,
  TraceabilityWorkflow,
} from '../src/appplication/traceability/workflow';
import {SessionError} from '../src/domain/auth/types';

const request = jest.fn();
const workflow = new TraceabilityWorkflow({request} as Api);
const order = {
  id: 'order',
  codigo: 'TCC-001',
  descricao: 'Caixa',
  estado: 'CADASTRADO',
};
const link: Provisioning = {
  id: 'old-id',
  pedidoId: order.id,
  uid: '53721F76950001',
  estrategia: 'UID',
  status: 'ATIVA',
  referenciaNdef: null,
  epoca: 1,
};
const lost = () => new SessionError('API_INDISPONIVEL', 'Resposta não chegou');
beforeEach(() => {
  request.mockReset();
});

test('creates a normalized order as the original user without inventing a UUID', async () => {
  request.mockResolvedValue(order);
  expect(
    await workflow.createOrder(
      {codigo: ' tcc-001 ', descricao: ' Caixa '},
      'admin',
    ),
  ).toEqual({order, recovered: false});
  expect(request).toHaveBeenCalledWith('/pedidos', {
    method: 'POST',
    body: {codigo: 'TCC-001', descricao: 'Caixa'},
    expectedUserId: 'admin',
  });
});

test.each(['', 'A B', 'NÃO', 'X'.repeat(65)])(
  'invalid code %s does not reach the API',
  async codigo => {
    await expect(workflow.createOrder({codigo}, 'admin')).rejects.toThrow(
      'código',
    );
    expect(request).not.toHaveBeenCalled();
  },
);

test('blank descriptions are omitted and descriptions over the contract limit fail locally', async () => {
  await expect(
    workflow.createOrder({codigo: 'A', descricao: 'X'.repeat(501)}, 'admin'),
  ).rejects.toThrow('500');
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValue(order);
  await workflow.createOrder({codigo: 'A', descricao: '   '}, 'admin');
  expect(request.mock.calls[0][1].body).toEqual({codigo: 'A'});
});

test('duplicate code or denied access is not recovered as a successful creation', async () => {
  for (const error of [
    new SessionError('CODIGO_PEDIDO_DUPLICADO', 'Duplicado', 409),
    new SessionError('ACESSO_NEGADO', 'Negado', 403),
  ]) {
    request.mockReset().mockRejectedValueOnce(error);
    await expect(
      workflow.createOrder({codigo: order.codigo}, 'admin'),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
  }
});

test('lost creation response recovers only the exact code and description, across pages', async () => {
  request
    .mockRejectedValueOnce(lost())
    .mockResolvedValueOnce({itens: [{...order, codigo: 'OTHER'}], total: 101})
    .mockResolvedValueOnce({itens: [order], total: 101});
  expect(
    await workflow.createOrder(
      {codigo: order.codigo, descricao: order.descricao},
      'admin',
    ),
  ).toEqual({order, recovered: true});
  expect(request.mock.calls[2]).toEqual([
    '/pedidos?busca=TCC-001&pagina=2&limite=100',
    {expectedUserId: 'admin'},
  ]);
});

test('a different description or unavailable recovery keeps the original failure', async () => {
  const error = lost();
  request
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce({itens: [order], total: 1});
  await expect(
    workflow.createOrder(
      {codigo: order.codigo, descricao: 'Outra caixa'},
      'admin',
    ),
  ).rejects.toBe(error);
  request
    .mockReset()
    .mockRejectedValueOnce(error)
    .mockRejectedValueOnce(new Error('lookup failed'));
  await expect(
    workflow.createOrder({codigo: order.codigo}, 'admin'),
  ).rejects.toBe(error);
});

test('closure and recovery target the exact old provisioning, never the latest UID epoch', async () => {
  const closed = {...link, status: 'DESPROVISIONADA'};
  request.mockRejectedValueOnce(lost()).mockResolvedValueOnce(closed);
  expect(await workflow.closeProvisioning(link, 'admin')).toEqual(closed);
  expect(request.mock.calls).toEqual([
    [
      '/provisionamentos/old-id/encerramento',
      {method: 'POST', expectedUserId: 'admin'},
    ],
    ['/provisionamentos/old-id', {expectedUserId: 'admin'}],
  ]);
});

test('active recovery and 403 never confirm closure', async () => {
  const error = lost();
  request.mockRejectedValueOnce(error).mockResolvedValueOnce(link);
  await expect(workflow.closeProvisioning(link, 'admin')).rejects.toBe(error);
  const denied = new SessionError('ACESSO_NEGADO', 'Negado', 403);
  request.mockReset().mockRejectedValueOnce(denied);
  await expect(workflow.closeProvisioning(link, 'admin')).rejects.toBe(denied);
  expect(request).toHaveBeenCalledTimes(1);
});

test('closed tags can be registered again, receiving the epoch returned by the server', async () => {
  const next = {...link, id: 'new-id', epoca: 2, status: 'REGISTRADA'};
  request
    .mockResolvedValueOnce({itens: [order], total: 1})
    .mockResolvedValueOnce({
      ...link,
      status: 'DESPROVISIONADA',
      modelo: 'FEIJU_MODELO_DESCONHECIDO',
    })
    .mockResolvedValueOnce(next);
  expect(
    await workflow.register(
      order.codigo,
      {uid: link.uid},
      'UID',
      'DESCONHECIDO',
    ),
  ).toEqual(next);
  expect(request.mock.calls[2][1].body.epoca).toBeUndefined();
  expect(request.mock.calls[2][1].body.modelo).toBe(
    'FEIJU_MODELO_DESCONHECIDO',
  );
});

test('a previous project NDEF reference prevents UID activation and never changes strategy silently', () => {
  expect(() =>
    workflow.activate(
      link,
      {uid: link.uid, ndef: 'urn:nfc-trace:provisioning:previous'},
      true,
    ),
  ).toThrow('Remova-a');
  expect(request).not.toHaveBeenCalled();
});
