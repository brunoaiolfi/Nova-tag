import {
  Api,
  Provisioning,
  TraceabilityWorkflow,
} from '../src/appplication/traceability/workflow';
import {
  createSdmBenchPlan,
  SDM_BENCH_PROFILE,
} from '../src/domain/nfc/sdm-profile';
import {bytesBase64} from '../src/domain/nfc/ndef';
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

const sdmPlan = createSdmBenchPlan(id);
const sdmLink: Provisioning = {
  ...link,
  estrategia: 'SDM',
  status: 'ATIVA',
  referenciaNdef: null,
  epoca: 1,
  sdm: {
    perfil: SDM_BENCH_PROFILE,
    perfilCandidato: true,
    politica: 'ESTRITA',
    referenciaChaves: id,
    versaoChaves: 1,
    metaReadSlot: 1,
    fileReadSlot: 2,
    uriTemplate: sdmPlan.uriTemplate,
  },
};
const sdmReading = {
  uid: link.uid,
  ndef: sdmPlan.uriTemplate,
  bytesBase64: bytesBase64(sdmPlan.messageBytes),
};
test('resolves candidate SDM by provisioning reference without UID fallback or local authentication', async () => {
  request.mockResolvedValue(sdmLink);
  const prepared = await workflow.prepare(
    {...sdmReading, uid: '04FFFFFFFFFFFF'},
    'COLETA',
    'capture',
    'time',
    'device',
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/provisionamentos/' + id);
  expect(prepared.leituraBruta.bytesBase64).toBe(sdmReading.bytesBase64);
  expect(prepared).not.toHaveProperty('autenticada');
  expect(prepared).not.toHaveProperty('epoca');
});
test('rejects missing SDM bytes, unknown profile and downgraded strategy without fallback', async () => {
  request.mockResolvedValue(sdmLink);
  await expect(
    workflow.resolveProvisioning({...sdmReading, bytesBase64: undefined}),
  ).rejects.toThrow('originais');
  request.mockResolvedValue({
    ...sdmLink,
    sdm: {...sdmLink.sdm, perfil: 'unknown'},
  });
  await expect(workflow.resolveProvisioning(sdmReading)).rejects.toThrow(
    'Perfil',
  );
  request.mockResolvedValue({...sdmLink, estrategia: 'UID'});
  await expect(workflow.resolveProvisioning(sdmReading)).rejects.toThrow(
    'estratégia',
  );
  const prior = request.mock.calls.length;
  await expect(
    workflow.resolveProvisioning({
      ...sdmReading,
      ndef: 'urn:nfc-trace:sdm:v2:other',
    }),
  ).rejects.toThrow('inválida');
  expect(request).toHaveBeenCalledTimes(prior);
});
test('passes immutable raw SDM proof when confirming a physically configured pending link', async () => {
  request.mockResolvedValue(sdmLink);
  await workflow.activate({...sdmLink, status: 'REGISTRADA'}, sdmReading, true);
  expect(request).toHaveBeenLastCalledWith(
    '/provisionamentos/' + id + '/ativacao',
    {method: 'POST', body: {bloqueioConfirmado: true, leituraSdm: sdmReading}},
  );
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

test('snapshot is taken before lookup and preserves original bytes/metadata on retries', async () => {
  let resolve!: (value: Provisioning) => void;
  request.mockImplementationOnce(
    () =>
      new Promise(finish => {
        resolve = finish;
      }),
  );
  const reading = {
    uid: link.uid,
    ndef: reference,
    bytesBase64: 'wQEA',
    tecnologias: ['IsoDep'],
    modelo: 'DESCONHECIDO',
  };
  const preparation = workflow.prepare(
    reading,
    'COLETA',
    'snapshot-id',
    'scan-time',
    'device',
  );
  reading.bytesBase64 = 'changed';
  reading.ndef = 'urn:other';
  reading.tecnologias.push('changed');
  resolve(link);
  const observation = await preparation;
  expect(observation.leituraBruta).toEqual({
    uid: link.uid,
    ndef: reference,
    bytesBase64: 'wQEA',
    tecnologias: ['IsoDep'],
    modelo: 'DESCONHECIDO',
  });
  expect(Object.isFrozen(observation)).toBe(true);
  expect(Object.isFrozen(observation.leituraBruta.tecnologias)).toBe(true);
  request
    .mockRejectedValueOnce(new Error('response lost'))
    .mockResolvedValueOnce({armazenada: true});
  await expect(workflow.send(observation, 'user')).rejects.toThrow(
    'response lost',
  );
  await workflow.send(observation, 'user');
  expect(request.mock.calls[1]).toEqual(request.mock.calls[2]);
});
