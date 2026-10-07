import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  SqliteCaptureStore,
  SqlConnection,
} from '../src/infra/offline/sqlite-store';
import {OfflineCoordinator} from '../src/appplication/offline/coordinator';
import type {CaptureContext} from '../src/domain/offline/types';
import {
  createSdmBenchPlan,
  SDM_BENCH_PROFILE,
} from '../src/domain/nfc/sdm-profile';
import {bytesBase64} from '../src/domain/nfc/ndef';
import type {
  Api,
  Observation,
  Provisioning,
  Decision,
} from '../src/appplication/traceability/workflow';

const owner = {baseUrl: 'http://127.0.0.1:3110/api/v1', userId: 'operator-a'};
const p: Provisioning = {
  id: '00000000-0000-4000-8000-000000000010',
  pedidoId: 'order-a',
  uid: '04AABBCCDDEE01',
  estrategia: 'UID',
  status: 'ATIVA',
  referenciaNdef: null,
  epoca: 1,
};
const response: Decision = {
  armazenada: true,
  decisao: {
    autorizada: true,
    motivo: 'ACEITA',
    classificacao: 'REGULAR',
    avisos: [],
  },
};
const input = (id = '00000000-0000-4000-8000-000000000001'): Observation => ({
  id,
  versaoContrato: 1,
  provisionamentoId: p.id,
  tipo: 'COLETA',
  ocorridoEm: '2026-10-06T12:00:00.000Z',
  dispositivoId: 'fixture-android',
  operadorId: owner.userId,
  leituraBruta: {
    uid: p.uid,
    bytesBase64: '0QEDVQBh',
    tecnologias: ['IsoDep', 'NfcA'],
  },
});
function connection(db: DatabaseSync): SqlConnection {
  let tail = Promise.resolve();
  const port: SqlConnection = {
    exec: async sql => {
      db.exec(sql);
    },
    run: async (sql, params = []) => ({
      changes: Number(db.prepare(sql).run(...params).changes),
    }),
    first: async <T>(sql: string, params: (string | number | null)[] = []) =>
      (db.prepare(sql).get(...params) as T | undefined) ?? null,
    all: async <T>(sql: string, params: (string | number | null)[] = []) =>
      db.prepare(sql).all(...params) as T[],
    transaction: work => {
      const pending = tail.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(port);
          db.exec('COMMIT');
          return result;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      });
      tail = pending.then(
        () => {},
        () => {},
      );
      return pending;
    },
  };
  return port;
}
let folder: string;
let db: DatabaseSync;
let sql: SqlConnection;
let store: SqliteCaptureStore;
let now: number;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'nova-tag-offline-'));
  db = new DatabaseSync(join(folder, 'queue.db'));
  sql = connection(db);
  store = new SqliteCaptureStore(async () => sql);
  now = Date.parse('2026-10-06T13:00:00Z');
});
afterEach(() => {
  db.close();
  rmSync(folder, {recursive: true, force: true});
});
async function enqueue(id?: string, order = p) {
  return store.enqueue(
    owner,
    input(id),
    {provisioning: order, cacheUsed: false},
    now,
  );
}
function coordinator() {
  let context: CaptureContext | null = {
    ...owner,
    canCapture: true,
    canSend: true,
  };
  const request = jest.fn();
  const resolve = jest.fn().mockResolvedValue(p);
  let identity = 0;
  const manager = new OfflineCoordinator(
    store,
    () => context,
    {request} as Api,
    resolve,
    () => 'lease-' + ++identity,
    () => now,
  );
  request.mockImplementation(async (_path, options) => ({
    itens: options.body.itens.map((item: Observation, indice: number) => ({
      indice,
      id: item.id,
      sucesso: true,
      status: 200,
      codigo: null,
      mensagem: 'ok',
      dados: response,
    })),
  }));
  return {
    manager,
    request,
    resolve,
    setContext: (next: CaptureContext | null) => {
      context = next;
    },
  };
}
test('commits bytes, owner and epoch durably across database close/reopen and rejects local mutation', async () => {
  const first = await enqueue();
  expect(first.state).toBe('QUEUED');
  db.close();
  db = new DatabaseSync(join(folder, 'queue.db'));
  sql = connection(db);
  store = new SqliteCaptureStore(async () => sql);
  expect((await store.list(owner))[0]).toEqual(first);
  await expect(
    store.enqueue(
      owner,
      {...input(), tipo: 'ENTREGA'},
      {provisioning: p, cacheUsed: false},
      now,
    ),
  ).rejects.toMatchObject({code: 'CAPTURA_LOCAL_CONFLITANTE'});
  await expect(
    sql.run('UPDATE captures SET payload=? WHERE id=?', ['{}', first.id]),
  ).rejects.toThrow('immutable');
  expect((await store.list(owner))[0].payload.leituraBruta.bytesBase64).toBe(
    '0QEDVQBh',
  );
  expect(await store.list({...owner, userId: 'operator-b'})).toEqual([]);
  expect(
    await store.list({...owner, baseUrl: 'https://another.example/api/v1'}),
  ).toEqual([]);
  expect(
    JSON.stringify(db.prepare('SELECT * FROM captures').all()),
  ).not.toMatch(/token|password|senha/);
});
test('simultaneous claims select each item once and block later captures of the same order', async () => {
  await enqueue();
  await enqueue('00000000-0000-4000-8000-000000000002');
  const [a, b] = await Promise.all([
    store.claim(owner, 'a', now, 45000, 20),
    store.claim(owner, 'b', now, 45000, 20),
  ]);
  expect(a.length + b.length).toBe(1);
  const claimed = [...a, ...b][0];
  await store.settle(claimed.id, claimed.claim!, {
    state: 'STORED',
    result: response,
    businessState: 'ACCEPTED',
  });
  expect(await store.claim(owner, 'c', now, 45000, 20)).toHaveLength(1);
});
test('recovers an expired claim and ignores stale acknowledgements', async () => {
  await enqueue();
  await store.claim(owner, 'old', now, 45000, 20);
  expect(
    await store.claim(owner, 'before-expiry', now + 44000, 45000, 20),
  ).toHaveLength(0);
  const recovered = await store.claim(owner, 'new', now + 45001, 45000, 20);
  expect(recovered).toHaveLength(1);
  await store.settle(input().id, 'old', {state: 'FAILED'});
  expect((await store.list(owner))[0].claim).toBe('new');
  await store.settle(input().id, 'new', {
    state: 'STORED',
    result: response,
    businessState: 'ACCEPTED',
  });
  const pending = {
    ...response,
    decisao: {
      ...response.decisao,
      autorizada: false,
      motivo: 'AGUARDANDO_ANTECEDENTE',
    },
  };
  await store.updateDecision(owner, input().id, pending);
  expect((await store.list(owner))[0]).toMatchObject({
    receipt: response,
    currentDecision: pending,
    businessState: 'PENDING',
  });
  await expect(
    sql.run('UPDATE captures SET receipt=? WHERE id=?', ['{}', input().id]),
  ).rejects.toThrow('immutable');
});
test('cache requires original scope, active/recent link and explicit NDEF reference without UID fallback', async () => {
  await store.remember(owner, p, now);
  expect(await store.cached(owner, {uid: p.uid}, now, 86400000)).toEqual(p);
  expect(
    await store.cached({...owner, userId: 'b'}, {uid: p.uid}, now, 86400000),
  ).toBeNull();
  expect(
    await store.cached(owner, {uid: p.uid}, now + 86400001, 86400000),
  ).toBeNull();
  expect(
    await store.cached(
      owner,
      {
        uid: p.uid,
        ndef: 'urn:nfc-trace:provisioning:00000000-0000-4000-8000-000000000099',
      },
      now,
      86400000,
    ),
  ).toBeNull();
  const ndef = {
    ...p,
    estrategia: 'NDEF_ESTATICO' as const,
    referenciaNdef: 'urn:nfc-trace:provisioning:' + p.id,
  };
  await store.remember(owner, ndef, now);
  expect(
    await store.cached(
      owner,
      {uid: 'different', ndef: ndef.referenciaNdef},
      now,
      86400000,
    ),
  ).toEqual(ndef);
  const next = {...p, id: '00000000-0000-4000-8000-000000000020', epoca: 2};
  await enqueue();
  await store.remember(owner, next, now + 1);
  expect((await store.list(owner))[0].metadata.provisioning.epoca).toBe(1);
  expect(await store.cached(owner, {uid: p.uid}, now + 1, 86400000)).toEqual(
    next,
  );
  await store.remember(owner, {...next, status: 'DESPROVISIONADA'}, now + 2);
  expect(await store.cached(owner, {uid: p.uid}, now + 2, 86400000)).toBeNull();
});
test('freezes reading before lookup and saves before any network send', async () => {
  const {manager, request, resolve} = coordinator();
  let complete!: (value: Provisioning) => void;
  resolve.mockReturnValueOnce(
    new Promise<Provisioning>(yes => {
      complete = yes;
    }),
  );
  const reading = {...input().leituraBruta, tecnologias: ['IsoDep']};
  const operation = manager.capture(
    reading,
    'COLETA',
    input().id,
    input().ocorridoEm,
    'fixture-android',
    owner,
  );
  reading.bytesBase64 = 'changed';
  reading.tecnologias.push('changed');
  complete(p);
  await operation;
  const queued = (await store.list(owner))[0];
  expect(queued.payload.leituraBruta).toMatchObject({
    bytesBase64: '0QEDVQBh',
    tecnologias: ['IsoDep'],
  });
  expect(request).not.toHaveBeenCalled();
});
test('offline capture uses a recent cache and unknown tags are not silently associated', async () => {
  const {manager, setContext, resolve} = coordinator();
  await store.remember(owner, p, now);
  setContext({...owner, canCapture: true, canSend: false});
  expect(
    await manager.capture(
      input().leituraBruta,
      'COLETA',
      input().id,
      input().ocorridoEm,
      'fixture-android',
    ),
  ).toMatchObject({metadata: {cacheUsed: true}});
  expect(resolve).not.toHaveBeenCalled();
  await expect(
    manager.capture(
      {uid: 'unknown'},
      'COLETA',
      'unknown-id',
      input().ocorridoEm,
      'device',
    ),
  ).rejects.toMatchObject({code: 'ETIQUETA_NAO_DISPONIVEL_OFFLINE'});
});
test('uncertain response retries the identical frozen payload and simultaneous sync calls share one operation', async () => {
  await enqueue();
  const {manager, request} = coordinator();
  request.mockRejectedValueOnce(new Error('response lost'));
  await manager.synchronize();
  expect((await store.list(owner))[0].state).toBe('RETRY');
  await Promise.all([manager.synchronize(true), manager.synchronize(true)]);
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  expect((await store.list(owner))[0]).toMatchObject({
    state: 'STORED',
    businessState: 'ACCEPTED',
    receipt: response,
  });
});
test('mixed batch results settle independently and terminal outcomes are not retried', async () => {
  for (let n = 1; n <= 4; n++)
    await enqueue('00000000-0000-4000-8000-' + String(n).padStart(12, '0'), {
      ...p,
      pedidoId: 'order-' + n,
    });
  const {manager, request} = coordinator();
  request.mockImplementationOnce(async (_path, options) => ({
    itens: options.body.itens.map((item: Observation, indice: number) =>
      indice === 0
        ? {
            indice,
            id: item.id,
            sucesso: true,
            status: 200,
            codigo: null,
            mensagem: 'stored',
            dados: {
              ...response,
              decisao: {
                ...response.decisao,
                autorizada: false,
                motivo: 'SEQUENCIA_INVALIDA',
              },
            },
          }
        : {
            indice,
            id: item.id,
            sucesso: false,
            status: [0, 409, 400, 500][indice],
            codigo: [
              '',
              'IDEMPOTENCIA_CONFLITO',
              'ENTRADA_INVALIDA',
              'ERRO_INTERNO',
            ][indice],
            mensagem: 'reason',
            dados: null,
          },
    ),
  }));
  await manager.synchronize();
  const rows = (await store.list(owner)).reverse();
  expect(rows.map(item => item.state)).toEqual([
    'STORED',
    'CONFLICT',
    'FAILED',
    'RETRY',
  ]);
  expect(rows[0].businessState).toBe('REJECTED');
  await manager.synchronize(true);
  expect(request.mock.calls[1][1].body.itens).toHaveLength(1);
});
test('expired authentication preserves captures and another operator/API cannot send or view them', async () => {
  await enqueue();
  const {manager, request, setContext} = coordinator();
  request.mockRejectedValueOnce({
    status: 401,
    code: 'SESSAO_INVALIDA',
    message: 'reauth',
  });
  await manager.synchronize();
  expect((await store.list(owner))[0].state).toBe('AUTH_REQUIRED');
  setContext({...owner, userId: 'operator-b', canCapture: true, canSend: true});
  expect(manager.getSnapshot().items).toEqual([]);
  await manager.synchronize(true);
  expect(request).toHaveBeenCalledTimes(1);
  setContext({...owner, canCapture: true, canSend: true});
  await manager.synchronize(true);
  expect((await store.list(owner))[0].state).toBe('STORED');
});
test('malformed receipts keep pending items and backoff prevents immediate loops', async () => {
  await enqueue();
  const {manager, request} = coordinator();
  request.mockResolvedValueOnce({itens: []});
  await manager.synchronize();
  expect((await store.list(owner))[0]).toMatchObject({
    state: 'RETRY',
    errorCode: 'RESPOSTA_INVALIDA',
  });
  await manager.synchronize();
  expect(request).toHaveBeenCalledTimes(1);
  now += 3000;
  await manager.synchronize();
  expect((await store.list(owner))[0].state).toBe('STORED');
});
test('opaque synthetic SDM evidence survives the same storage/retry path without being authenticated', async () => {
  const payload = {
    ...input(),
    leituraBruta: {
      ...input().leituraBruta,
      ndef: 'urn:nfc-trace:sdm:v1:fixture?picc_data=ABCD&cmac=1234',
      bytesBase64: 'AAAA//8=',
    },
  };
  await store.enqueue(owner, payload, {provisioning: p, cacheUsed: true}, now);
  db.close();
  db = new DatabaseSync(join(folder, 'queue.db'));
  sql = connection(db);
  store = new SqliteCaptureStore(async () => sql);
  expect((await store.list(owner))[0].payload).toEqual(payload);
  const {manager, request} = coordinator();
  request.mockRejectedValueOnce(new Error('offline'));
  await manager.synchronize();
  await manager.synchronize(true);
  expect(request.mock.calls[0][1].body.itens[0]).toEqual(payload);
  expect(request.mock.calls[1][1].body.itens[0]).toEqual(payload);
});
test('a switched identity during lookup cannot confirm under another operator', async () => {
  const {manager, setContext, resolve} = coordinator();
  resolve.mockImplementationOnce(async () => {
    setContext({...owner, userId: 'b', canCapture: true, canSend: true});
    return p;
  });
  await expect(
    manager.capture(
      input().leituraBruta,
      'COLETA',
      input().id,
      input().ocorridoEm,
      'device',
      owner,
    ),
  ).rejects.toMatchObject({code: 'OPERADOR_DIVERGENTE'});
  expect(await store.list(owner)).toEqual([]);
});

test('retrying a committed local confirmation never resolves a newer epoch for the same UUID', async () => {
  const {manager, resolve} = coordinator();
  const payload = input();
  const original = await manager.capture(
    payload.leituraBruta,
    payload.tipo,
    payload.id,
    payload.ocorridoEm,
    payload.dispositivoId,
    owner,
  );
  resolve.mockResolvedValue({
    ...p,
    id: '00000000-0000-4000-8000-000000000020',
    epoca: 2,
  });
  const recovered = await manager.capture(
    {...payload.leituraBruta},
    payload.tipo,
    payload.id,
    payload.ocorridoEm,
    payload.dispositivoId,
    owner,
  );
  expect(recovered).toEqual(original);
  expect(resolve).toHaveBeenCalledTimes(1);
  await expect(
    manager.capture(
      payload.leituraBruta,
      'ENTREGA',
      payload.id,
      payload.ocorridoEm,
      payload.dispositivoId,
      owner,
    ),
  ).rejects.toMatchObject({code: 'CAPTURA_LOCAL_CONFLITANTE'});
});

test('a local lookup failure cannot silently fall back to a cached link', async () => {
  const {manager, resolve} = coordinator();
  await store.remember(owner, p, now);
  resolve.mockRejectedValue(new TypeError('local implementation failed'));
  const payload = input();
  await expect(
    manager.capture(
      payload.leituraBruta,
      payload.tipo,
      payload.id,
      payload.ocorridoEm,
      payload.dispositivoId,
      owner,
    ),
  ).rejects.toThrow('local implementation failed');
  expect(await store.list(owner)).toEqual([]);
});

test('malformed native evidence is not locally confirmed or silently normalized', async () => {
  const {manager, resolve} = coordinator();
  const payload = input();
  await expect(
    manager.capture(
      {...payload.leituraBruta, ndef: {} as string},
      payload.tipo,
      payload.id,
      payload.ocorridoEm,
      payload.dispositivoId,
      owner,
    ),
  ).rejects.toMatchObject({code: 'LEITURA_INVALIDA'});
  expect(resolve).not.toHaveBeenCalled();
  expect(await store.list(owner)).toEqual([]);
});

test('stores candidate SDM offline across cold reopen, retries 503 unchanged and displays separate late decision', async () => {
  const plan = createSdmBenchPlan(p.id);
  const sdm: Provisioning = {
    ...p,
    estrategia: 'SDM',
    sdm: {
      perfil: SDM_BENCH_PROFILE,
      perfilCandidato: true,
      politica: 'REGISTRO_TARDIO',
      referenciaChaves: p.id,
      versaoChaves: 1,
      metaReadSlot: 1,
      fileReadSlot: 2,
      uriTemplate: plan.uriTemplate,
    },
  };
  const reading = {
    uid: '04FFFFFFFFFFFF',
    ndef: plan.uriTemplate,
    bytesBase64: bytesBase64(plan.messageBytes),
  };
  // Placeholder evidence checks storage/layout only and is not cryptographically valid.
  await store.remember(owner, sdm, now);
  const {manager, setContext, request, resolve} = coordinator();
  setContext({...owner, canCapture: true, canSend: false});
  const local = await manager.capture(
    reading,
    'COLETA',
    input().id,
    input().ocorridoEm,
    'synthetic-device',
  );
  expect(local.metadata.provisioning.estrategia).toBe('SDM');
  expect(local.metadata.provisioning.sdm?.politica).toBe('REGISTRO_TARDIO');
  expect(local.payload.leituraBruta).toEqual(reading);
  expect(resolve).not.toHaveBeenCalled();
  db.close();
  db = new DatabaseSync(join(folder, 'queue.db'));
  sql = connection(db);
  store = new SqliteCaptureStore(async () => sql);
  expect((await store.get(owner, local.id))?.payload).toEqual(local.payload);
  const next = coordinator();
  next.request.mockRejectedValueOnce({
    status: 503,
    code: 'SDM_CHAVES_INDISPONIVEIS',
    message: 'cofre',
  });
  await next.manager.synchronize();
  expect((await store.get(owner, local.id))?.state).toBe('RETRY');
  const result: Decision = {
    armazenada: true,
    decisao: {
      autorizada: false,
      motivo: 'SDM_REGISTRO_TARDIO',
      classificacao: 'REGULAR',
      avisos: [],
      sdm: {
        perfil: SDM_BENCH_PROFILE,
        politica: 'REGISTRO_TARDIO',
        epoca: 1,
        autenticada: true,
        previamenteUtilizada: false,
        contador: 2,
        maiorContadorAnterior: 10,
        temporalidade: 'TARDIA',
      },
    },
  };
  next.request.mockResolvedValueOnce({
    itens: [
      {
        indice: 0,
        id: local.id,
        sucesso: true,
        status: 200,
        codigo: null,
        mensagem: 'stored',
        dados: result,
      },
    ],
  });
  await next.manager.synchronize(true);
  const saved = await store.get(owner, local.id);
  expect(saved?.state).toBe('STORED');
  expect(saved?.businessState).toBe('REJECTED');
  expect(saved?.currentDecision?.decisao.sdm?.autenticada).toBe(true);
  expect(next.request.mock.calls[0][1].body).toEqual(
    next.request.mock.calls[1][1].body,
  );
  expect(request).not.toHaveBeenCalled();
});

test('offline SDM does not follow latest UID across unknown epochs or altered profiles', async () => {
  await store.remember(owner, p, now);
  const plan = createSdmBenchPlan(p.id);
  const raw = {
    uid: p.uid,
    ndef: plan.uriTemplate,
    bytesBase64: bytesBase64(plan.messageBytes),
  };
  await expect(store.cached(owner, raw, now, 10000)).rejects.toThrow(
    'estratégia',
  );
  const other = createSdmBenchPlan('00000000-0000-4000-8000-000000000011');
  expect(
    await store.cached(
      owner,
      {
        ...raw,
        ndef: other.uriTemplate,
        bytesBase64: bytesBase64(other.messageBytes),
      },
      now,
      10000,
    ),
  ).toBeNull();
});
