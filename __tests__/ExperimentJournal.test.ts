import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {
  SqliteCaptureStore,
  SqlConnection,
} from '../src/infra/offline/sqlite-store';
import {SqliteExperimentJournal} from '../src/infra/experimentation/sqlite-journal';
import {ExperimentJournal} from '../src/appplication/experimentation/journal';
import {OfflineCoordinator} from '../src/appplication/offline/coordinator';
import type {
  ExperimentPlan,
  MonotonicClock,
} from '../src/domain/experimentation/types';
import type {
  Api,
  Observation,
  Provisioning,
  Decision,
} from '../src/appplication/traceability/workflow';
import type {CaptureContext} from '../src/domain/offline/types';
function connection(db: DatabaseSync): SqlConnection {
  let tail = Promise.resolve();
  const port: SqlConnection = {
    exec: async s => {
      db.exec(s);
    },
    run: async (s, p = []) => ({
      changes: Number(db.prepare(s).run(...p).changes),
    }),
    first: async <T>(s: string, p: (string | number | null)[] = []) =>
      (db.prepare(s).get(...p) as T) ?? null,
    all: async <T>(s: string, p: (string | number | null)[] = []) =>
      db.prepare(s).all(...p) as T[],
    transaction: work => {
      const next = tail.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(port);
          db.exec('COMMIT');
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      });
      tail = next.then(
        () => {},
        () => {},
      );
      return next;
    },
  };
  return port;
}
const original = {
  baseUrl: 'http://localhost:3000/api/v1',
  userId: 'operator-a',
  canCapture: true,
  canSend: true,
};
const p: Provisioning = {
  id: randomUUID(),
  pedidoId: 'order',
  uid: '04AABBCCDDEE01',
  estrategia: 'UID',
  status: 'ATIVA',
  epoca: 1,
  referenciaNdef: null,
};
const plan: ExperimentPlan = {
  id: randomUUID(),
  runId: randomUUID(),
  sessionId: randomUUID(),
  tagLabel: 'tag1',
  boxLabel: 'box1',
  deviceId: 'ios-1',
  deviceModel: 'fixture',
  osVersion: 'fixture',
  provisioningId: p.id,
  treatment: 'UID',
  policy: null,
  scenario: 'LEGITIMO_OFFLINE',
  mode: 'LEITURA_FISICA',
  ordinal: 1,
  eventType: 'COLETA',
  timeoutMs: 1000,
};
const receipt: Decision = {
  armazenada: true,
  decisao: {
    autorizada: true,
    status: 'AUTORIZADA',
    revisao: 1,
    motivo: 'ACEITA',
    classificacao: 'REGULAR',
    avisos: [],
  },
};
let db: DatabaseSync,
  sql: SqlConnection,
  captures: SqliteCaptureStore,
  store: SqliteExperimentJournal,
  journal: ExperimentJournal,
  context: CaptureContext | null,
  time: number,
  wall: number,
  clock: MonotonicClock,
  request: jest.Mock,
  api: Api;
const input = (): Observation => ({
  id: randomUUID(),
  versaoContrato: 1,
  provisionamentoId: p.id,
  tipo: 'COLETA',
  ocorridoEm: '2026-10-07T00:00:00Z',
  dispositivoId: 'ios-1',
  leituraBruta: {uid: p.uid, bytesBase64: '0QEDVQBh'},
});
const create = (origin = clock.originId) =>
  new ExperimentJournal(
    store,
    () => context,
    api,
    randomUUID,
    {originId: origin, nowMs: () => time},
    async () => plan.deviceId,
    () => wall,
  );
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  sql = connection(db);
  captures = new SqliteCaptureStore(async () => sql);
  store = new SqliteExperimentJournal(
    async () => sql,
    () => captures.initialize(),
  );
  context = {...original};
  time = 10;
  wall = Date.parse('2026-10-07T00:00:00Z');
  clock = {originId: randomUUID(), nowMs: () => time};
  request = jest.fn().mockResolvedValue({});
  api = {request};
  journal = create();
});
afterEach(() => db.close());
test('persists the beginning before a read, survives failed reads and excludes wall-clock jumps from durations', async () => {
  await journal.select(plan, true);
  const attempt = await journal.start('COLETA');
  expect((await store.records(original)).map(r => r.stage)).toEqual([
    'TENTATIVA_INICIADA',
  ]);
  const start = time;
  wall -= 864000000;
  time += 18;
  await journal.finish(attempt, start, false, 'NFC_TIMEOUT');
  const result = (await store.records(original))[1];
  expect(result).toMatchObject({
    stage: 'LEITURA_FALHOU',
    durationMs: 18,
    clockId: clock.originId,
    code: 'NFC_TIMEOUT',
  });
  await journal.flush();
  expect(request).not.toHaveBeenCalled();
  await journal.release([]);
  await journal.flush();
  expect((await store.counts(original)).sent).toBe(2);
});
test('capture and its experiment link commit together, preserve exact bytes and roll back together', async () => {
  await journal.select(plan);
  const a = await journal.start('COLETA');
  await journal.finish(a, time, true, 'OK');
  const payload = input();
  const experiment = await journal.capture(a, payload);
  db.exec(
    "CREATE TRIGGER fixture_fail BEFORE INSERT ON experiment_records WHEN json_extract(NEW.input,'$.stage')='CAPTURA_LOCAL' BEGIN SELECT RAISE(ABORT,'fixture failure'); END",
  );
  await expect(
    captures.enqueue(
      original,
      payload,
      {provisioning: p, cacheUsed: false, experiment},
      wall,
    ),
  ).rejects.toThrow('fixture failure');
  expect(await captures.get(original, payload.id)).toBeNull();
  expect(await store.records(original)).toHaveLength(2);
  db.exec('DROP TRIGGER fixture_fail');
  const saved = await captures.enqueue(
    original,
    payload,
    {provisioning: p, cacheUsed: false, experiment},
    wall,
  );
  expect(saved.payload).toEqual(payload);
  expect(saved.payload.leituraBruta.bytesBase64).toBe('0QEDVQBh');
  await captures.enqueue(
    original,
    payload,
    {provisioning: p, cacheUsed: false, experiment},
    wall,
  );
  expect(await store.records(original)).toHaveLength(3);
  await expect(
    sql.run("UPDATE experiment_records SET input='{}'"),
  ).rejects.toThrow('immutable');
});
test('cold start marks unfinished reads censored once and never fabricates a cross-origin duration', async () => {
  await journal.select(plan, true);
  await journal.start('COLETA');
  const next = create(randomUUID());
  time = 2;
  await next.state();
  await next.state();
  expect(
    (await store.records(original)).filter(
      r => r.stage === 'LEITURA_INTERROMPIDA',
    ),
  ).toHaveLength(1);
  const a = await next.start('COLETA');
  await next.finish(a, time, true);
  const payload = input();
  await captures.enqueue(
    original,
    payload,
    {
      provisioning: p,
      cacheUsed: true,
      experiment: await next.capture(a, payload),
    },
    wall,
  );
  const item = (await captures.get(original, payload.id))!;
  await next.release([item]);
  const restarted = create(randomUUID());
  await restarted.decision(item, receipt);
  expect(
    (await store.records(original)).find(
      r => r.stage === 'RECONCILIACAO_CONCLUIDA',
    ),
  ).toMatchObject({durationMs: null, code: 'SEM_RELOGIO_ORIGINAL'});
});
test('retries telemetry after response loss using the same UUID and isolates accounts/API URLs', async () => {
  await journal.select(plan);
  await journal.start('COLETA');
  request.mockRejectedValueOnce(new Error('lost response'));
  await journal.flush();
  const first = request.mock.calls[0][1].body;
  wall += 5000;
  await journal.flush();
  expect(request.mock.calls[1][1].body).toEqual(first);
  context = {...original, userId: 'operator-b'};
  await journal.flush();
  expect(request).toHaveBeenCalledTimes(2);
  expect((await journal.state()).plan).toBeNull();
  await expect(
    journal.capture({owner: original, plan, id: randomUUID()}, input()),
  ).rejects.toMatchObject({code: 'ROTEIRO_INCOMPATIVEL'});
  context = {...original, baseUrl: 'https://another.example/api/v1'};
  expect((await journal.state()).pending).toBe(0);
});
test('holds actual operational dispatch, resumes it and separates server storage from the final decision', async () => {
  await journal.select(plan, true);
  const a = await journal.start('COLETA');
  await journal.finish(a, time, true);
  const payload = input();
  await captures.enqueue(
    original,
    payload,
    {
      provisioning: p,
      cacheUsed: true,
      experiment: await journal.capture(a, payload),
    },
    wall,
  );
  request.mockImplementation(async (path: string) =>
    path === '/eventos/lote'
      ? {
          itens: [
            {
              indice: 0,
              id: payload.id,
              sucesso: true,
              status: 200,
              codigo: null,
              mensagem: 'ok',
              dados: receipt,
            },
          ],
        }
      : {},
  );
  const coordinator = new OfflineCoordinator(
    captures,
    () => context,
    api,
    async () => p,
    randomUUID,
    () => wall,
    journal,
  );
  await coordinator.synchronize();
  expect(request).not.toHaveBeenCalled();
  await journal.release(await captures.list(original));
  time += 100;
  await coordinator.synchronize();
  expect((await captures.get(original, payload.id))?.state).toBe('STORED');
  expect(
    (await store.records(original)).find(
      r => r.stage === 'RECONCILIACAO_CONCLUIDA',
    )?.durationMs,
  ).toBe(100);
  await journal.decision((await captures.get(original, payload.id))!, receipt);
  expect(
    (await store.records(original)).filter(
      r => r.stage === 'RECONCILIACAO_CONCLUIDA',
    ),
  ).toHaveLength(1);
});
test('upgrades existing capture storage without changing the operational payload', async () => {
  await captures.enqueue(
    original,
    input(),
    {provisioning: p, cacheUsed: false},
    wall,
  );
  const before = await captures.list(original);
  // Reconstruct the pre-instrumentation schema for a real v1 -> v2 migration.
  db.exec(
    'DROP TRIGGER experiment_record_immutable;DROP TABLE experiment_records;DROP TABLE experiment_selection;PRAGMA user_version=1',
  );
  captures = new SqliteCaptureStore(async () => sql);
  await captures.initialize();
  expect(await captures.list(original)).toEqual(before);
  expect(
    await sql.first<{user_version: number}>('PRAGMA user_version'),
  ).toEqual({user_version: 2});
});
test('rejects synthetic plans in the physical app and wrong planned steps/devices', async () => {
  await expect(
    journal.select({...plan, mode: 'SINTETICA'}),
  ).rejects.toMatchObject({code: 'ROTEIRO_INCOMPATIVEL'});
  await expect(
    journal.select({...plan, deviceId: 'other'}),
  ).rejects.toMatchObject({code: 'ROTEIRO_INCOMPATIVEL'});
  await journal.select(plan);
  await expect(journal.start('ENTREGA')).rejects.toMatchObject({
    code: 'ROTEIRO_INCOMPATIVEL',
  });
});
