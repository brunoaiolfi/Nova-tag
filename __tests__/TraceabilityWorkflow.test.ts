import {
  Api,
  Provisioning,
  TraceabilityWorkflow,
} from '../src/appplication/traceability/workflow';
const id = '00000000-0000-4000-8000-000000000001';
const reference = `urn:nfc-trace:provisioning:${id}`;
const link: Provisioning = {
  id,
  pedidoId: 'order',
  uid: '04A1B2C3D4E5F6',
  estrategia: 'NDEF_ESTATICO',
  status: 'REGISTRADA',
  referenciaNdef: reference,
};
const request = jest.fn();
const workflow = new TraceabilityWorkflow({request} as Api);
beforeEach(() => {
  request.mockReset();
});
test('resumes exact pending link without duplicate registration', async () => {
  request
    .mockResolvedValueOnce({
      itens: [{id: 'order', codigo: 'TCC-001', estado: 'CADASTRADO'}],
      total: 1,
    })
    .mockResolvedValueOnce(link);
  expect(
    await workflow.register(
      ' tcc-001 ',
      {uid: link.uid},
      'NDEF_ESTATICO',
      'NTAG',
    ),
  ).toBe(link);
  expect(request).toHaveBeenCalledTimes(2);
});
test('registration supplies real order ID, tag model and strategy', async () => {
  request
    .mockResolvedValueOnce({
      itens: [{id: 'order', codigo: 'TCC-001', estado: 'CADASTRADO'}],
      total: 1,
    })
    .mockRejectedValueOnce({code: 'ETIQUETA_NAO_ENCONTRADA'})
    .mockResolvedValueOnce(link);
  await workflow.register('TCC-001', {uid: link.uid}, 'NDEF_ESTATICO', 'NTAG');
  expect(request).toHaveBeenLastCalledWith('/etiquetas', {
    method: 'POST',
    body: {
      pedidoId: 'order',
      uid: link.uid,
      modelo: 'NTAG',
      estrategia: 'NDEF_ESTATICO',
    },
  });
});
test('lost registration response recovers persisted exact link', async () => {
  request
    .mockResolvedValueOnce({
      itens: [{id: 'order', codigo: 'TCC-001', estado: 'CADASTRADO'}],
      total: 1,
    })
    .mockRejectedValueOnce({code: 'ETIQUETA_NAO_ENCONTRADA'})
    .mockRejectedValueOnce(new Error('connection lost'))
    .mockResolvedValueOnce(link);
  expect(
    await workflow.register(
      'TCC-001',
      {uid: link.uid},
      'NDEF_ESTATICO',
      'NTAG',
    ),
  ).toBe(link);
});
test('never activates without physical confirmation or with mismatched NDEF', () => {
  expect(() =>
    workflow.activate(link, {uid: link.uid, ndef: reference}, false),
  ).toThrow('física');
  expect(() =>
    workflow.activate(link, {uid: link.uid, ndef: 'other'}, true),
  ).toThrow('diverge');
  expect(request).not.toHaveBeenCalled();
});
test('copied NDEF resolves original provisioning even with different UID', async () => {
  request.mockResolvedValue(link);
  const observation = await workflow.prepare(
    {uid: '04FFFFFFFFFFFF', ndef: reference},
    'COLETA',
    'capture',
    'time',
    'device',
  );
  expect(request).toHaveBeenCalledWith(`/provisionamentos/${id}`);
  expect(observation.leituraBruta.uid).toBe('04FFFFFFFFFFFF');
  expect(observation.provisionamentoId).toBe(id);
});
test('invalid NDEF reference never falls back to UID lookup', async () => {
  await expect(
    workflow.prepare(
      {uid: link.uid, ndef: 'urn:nfc-trace:provisioning:invalid'},
      'COLETA',
      'capture',
      'time',
      'device',
    ),
  ).rejects.toThrow('fallback');
  expect(request).not.toHaveBeenCalled();
});
test('retransmits exact UUID/body and keeps storage separate from authorization', async () => {
  request.mockResolvedValueOnce({...link, estrategia: 'UID'});
  const observation = await workflow.prepare(
    {uid: link.uid},
    'ENTREGA',
    'same-id',
    'same-time',
    'device',
  );
  const rejection = {
    armazenada: true,
    decisao: {autorizada: false, motivo: 'SEQUENCIA_INVALIDA'},
  };
  request
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValueOnce(rejection);
  await expect(workflow.send(observation, 'user')).rejects.toThrow(
    'lost response',
  );
  expect(await workflow.send(observation, 'user')).toBe(rejection);
  expect(request.mock.calls[1]).toEqual(request.mock.calls[2]);
  expect(request.mock.calls[2][1]).toEqual({
    method: 'POST',
    body: observation,
    expectedUserId: 'user',
  });
});
