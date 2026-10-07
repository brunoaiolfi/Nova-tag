import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {SqliteAdministrationStore} from '../src/infra/administration/sqlite-store';
import {assertReply, commandBytes} from '../src/domain/administration/types';
import {
  localDatabase,
  context,
  operation,
  session,
  frame,
  reply,
  verified,
  provisioning,
  id,
  connection,
} from '../tests/support/administration';
let local: ReturnType<typeof localDatabase>;
beforeEach(async () => {
  local = localDatabase();
  await local.store.saveOperation(operation, context);
  await local.store.saveSession(session);
  await local.store.saveReply(session, reply());
});
afterEach(() => local.db.close());
test('concurrent claims permit one physical attempt and never restore READY', async () => {
  const results = await Promise.allSettled([
    local.store.attempt(session, frame),
    local.store.attempt(session, frame),
  ]);
  expect(results.map(x => x.status).sort()).toEqual(['fulfilled', 'rejected']);
  expect((await local.store.commands(session.id, context))[0].state).toBe(
    'ATTEMPTED',
  );
  await local.store.saveReply(session, reply());
  await expect(local.store.attempt(session, frame)).rejects.toMatchObject({
    code: 'ADMIN_DIARIO_CONFLITANTE',
  });
});
test('response and original HTTP receipt are immutable and require a prior intent', async () => {
  await expect(local.store.response(session, frame, '9100')).rejects.toThrow(
    'Nenhuma transmissão',
  );
  await local.store.attempt(session, frame);
  await local.store.response(session, frame, '9100');
  await expect(local.store.response(session, frame, '91AE')).rejects.toThrow(
    'original',
  );
  await local.store.acknowledge(session, frame, reply(session.id, null));
  await expect(
    local.store.acknowledge(session, frame, {
      ...reply(session.id, null),
      expiraEm: '2027-01-01T00:00:00Z',
    }),
  ).rejects.toThrow('primeiro recibo');
  expect(() =>
    local.db.prepare("UPDATE admin_commands SET response_hex='91AE'").run(),
  ).toThrow('immutable');
});
test('receipt and next command roll back together when a conflicting checkpoint is returned', async () => {
  const next = {...frame, id: id(10), sequencia: 2};
  const other = {...session, id: id(11), rfId: id(12)};
  await local.store.saveSession(other);
  await local.store.saveReply(other, reply(other.id, next));
  await local.store.attempt(session, frame);
  await local.store.response(session, frame, '9100');
  await expect(
    local.store.acknowledge(session, frame, reply(session.id, next)),
  ).rejects.toThrow('divergente');
  const original = (await local.store.commands(session.id, context))[0];
  expect(original.state).toBe('RESPONSE');
  expect(original.receipt).toBeNull();
});
test('plan, account, source and RF identity cannot be substituted', async () => {
  await expect(
    local.store.saveOperation(
      {...operation, plano: {...operation.plano, epoca: 2}},
      context,
    ),
  ).rejects.toThrow('plano não pode mudar');
  const other = {...context, userId: id(15)};
  expect(await local.store.operation(operation.id, other)).toBeNull();
  expect(await local.store.commands(session.id, other)).toEqual([]);
  await expect(
    local.store.attempt({...session, owner: other}, frame),
  ).rejects.toThrow('sessão NFC');
  await expect(local.store.saveReply(session, reply(id(16)))).rejects.toThrow(
    'incompatível',
  );
  await local.store.endSession(session.id, context);
  await expect(local.store.attempt(session, frame)).rejects.toThrow(
    'sessão NFC',
  );
});
test('an unused draft adopts the original server operation without replacing any prepared plan', async () => {
  const p = id(30),
    original = {
      ...operation,
      id: id(31),
      plano: {...operation.plano, provisionamentoId: p},
    };
  await local.store.saveDraft({
    id: id(32),
    provisioningId: p,
    owner: context,
    station: context.station,
  });
  await local.store.saveOperation(original, context);
  expect((await local.store.draft(p, context))?.id).toBe(original.id);
  await expect(
    local.store.saveOperation({...original, id: id(33)}, context),
  ).rejects.toThrow('UNIQUE');
  expect((await local.store.operation(original.id, context))?.hashPlano).toBe(
    original.hashPlano,
  );
});
test('rejected activation evidence is preserved and a fresh capture can replace the pending attempt', async () => {
  await local.store.saveOperation(verified, context);
  const evidence = {
    operationId: operation.id,
    owner: context,
    reading: {uid: provisioning.uid},
    capturedAt: '2026-10-07T12:00:01Z',
    receipt: null,
  };
  await local.store.saveActivation(evidence);
  await local.store.rejectActivation(
    operation.id,
    context,
    'SDM_ATIVACAO_INVALIDA',
  );
  expect(await local.store.activation(operation.id, context)).toBeNull();
  await local.store.saveActivation({
    ...evidence,
    capturedAt: '2026-10-07T12:00:02Z',
  });
  await local.store.completeActivation(operation.id, context, {
    ...provisioning,
    status: 'ATIVA',
  });
  expect(
    local.db.prepare('SELECT count(*) as n FROM admin_activation').get(),
  ).toEqual({n: 2});
  expect(
    (await local.store.activation(operation.id, context))?.receipt?.status,
  ).toBe('ATIVA');
  expect(() =>
    local.db.prepare("UPDATE admin_activation SET reading='{}'").run(),
  ).toThrow('immutable');
});
test('reopening a real SQLite file preserves an unknown physical attempt', async () => {
  const prefix = resolve(tmpdir()),
    folder = mkdtempSync(join(prefix, 'nova-tag-administration-')),
    path = join(folder, 'journal.db');
  let db = new DatabaseSync(path);
  try {
    let sql = connection(db),
      store = new SqliteAdministrationStore(async () => sql);
    await store.saveOperation(operation, context);
    await store.saveSession(session);
    await store.saveReply(session, reply());
    await store.attempt(session, frame);
    db.close();
    db = new DatabaseSync(path);
    sql = connection(db);
    store = new SqliteAdministrationStore(async () => sql);
    expect((await store.commands(session.id, context))[0].state).toBe(
      'ATTEMPTED',
    );
    await expect(store.attempt(session, frame)).rejects.toThrow(
      'Não o retransmita',
    );
  } finally {
    db.close();
    if (!resolve(folder).startsWith(prefix + sep))
      throw new Error('Temporary path outside test directory');
    rmSync(folder, {recursive: true, force: true});
  }
});
test.each([
  '905C00000000',
  '90C400002900' + '00'.repeat(40) + '00',
  '9071000002050000',
  '90AD00000F02000100500000' + '00'.repeat(8) + '00',
])('unknown instructions/invalid framing are rejected: %s', apduHex => {
  expect(() => commandBytes({...frame, apduHex})).toThrow('incompatível');
});
test('completion requires all five authenticated slots', () => {
  expect(() =>
    assertReply(
      {
        ...reply(session.id, null),
        resultado: {
          ...reply(session.id, null).resultado!,
          slotsAutenticados: [0],
        },
      },
      session.id,
    ),
  ).toThrow('incompatível');
});
