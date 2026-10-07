import {
  AdministrationCoordinator,
  AdministrativeNfc,
} from '../src/appplication/administration/coordinator';
import type {Api} from '../src/appplication/traceability/workflow';
import {
  AdministrationError,
  AdminCommand,
} from '../src/domain/administration/types';
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
  now,
} from '../tests/support/administration';
const unavailable = () =>
  new AdministrationError('API_INDISPONIVEL', 'Rede indisponível');
let local: ReturnType<typeof localDatabase>;
beforeEach(async () => {
  local = localDatabase();
  await local.store.saveOperation(operation, context);
});
afterEach(() => local.db.close());
function harness() {
  let current = {...context},
    op = {...operation},
    count = 100,
    sessionId = '',
    failResponses = 0,
    failInterruption = false;
  const responseBodies: unknown[] = [];
  const request = jest.fn(
    async (path: string, options?: Parameters<Api['request']>[1]) => {
      if (path.endsWith('/sessoes')) {
        sessionId = (options!.body as {id: string}).id;
        op = {...op, status: 'PERSONALIZANDO', sessaoAtivaId: sessionId};
        return reply(sessionId);
      }
      if (path.endsWith('/respostas')) {
        responseBodies.push(options!.body);
        if (failResponses-- > 0) throw unavailable();
        op = {...verified};
        return reply(sessionId, null);
      }
      if (path.endsWith('/interrupcao')) {
        if (failInterruption) throw unavailable();
        op = {...op, status: 'INTERROMPIDA', sessaoAtivaId: null};
        return {};
      }
      if (path.endsWith(`/operacoes/${operation.id}`)) return op;
      throw new Error('Unexpected path ' + path);
    },
  );
  const transceive = jest.fn(async () => [0x91, 0]);
  const checkpoint = jest.fn();
  const nfc: AdministrativeNfc = {
    run: async (_op, work) => work({id: id(++count), checkpoint, transceive}),
    cancel: jest.fn(async () => {}),
    read: jest.fn(async () => ({uid: provisioning.uid})),
  };
  const coordinator = new AdministrationCoordinator(
    {request} as Api,
    local.store,
    nfc,
    async () => current,
    () => id(++count),
    () => now,
  );
  return {
    coordinator,
    request,
    nfc,
    transceive,
    checkpoint,
    responseBodies,
    setContext: (v: typeof current) => {
      current = v;
    },
    setFailures: (n: number, interrupt = false) => {
      failResponses = n;
      failInterruption = interrupt;
    },
    setOperation: (v: typeof operation) => {
      op = v;
    },
    getSessionId: () => sessionId,
  };
}
const materials = Array<'ATUAL'>(5).fill('ATUAL');
test('intent is committed before NFC, response before HTTP, and a lost HTTP response never retransmits NFC', async () => {
  const h = harness();
  h.setFailures(1);
  h.transceive.mockImplementation(async () => {
    const row = (await local.store.commands(h.getSessionId(), context))[0];
    expect(row.state).toBe('ATTEMPTED');
    return [0x91, 0];
  });
  const original = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (path, options) => {
    if (path.endsWith('/respostas')) {
      const row = (await local.store.commands(h.getSessionId(), context))[0];
      expect(row.state).toBe('RESPONSE');
      expect(row.responseHex).toBe('9100');
    }
    return original(path, options);
  });
  expect(
    (await h.coordinator.execute(operation, materials, () => {}))
      .alteracaoFisica,
  ).toBe('CONFERIDA');
  expect(h.transceive).toHaveBeenCalledTimes(1);
  expect(h.responseBodies).toHaveLength(2);
  expect(h.responseBodies[1]).toEqual(h.responseBodies[0]);
  expect((await local.store.commands(h.getSessionId(), context))[0].state).toBe(
    'ACKNOWLEDGED',
  );
});
test('a SQLite intent failure stops before the physical transmission', async () => {
  const h = harness();
  local.db.exec(
    "CREATE TRIGGER simulate_disk_failure BEFORE UPDATE OF state ON admin_commands WHEN NEW.state='ATTEMPTED' BEGIN SELECT RAISE(ABORT,'Disk full');END;",
  );
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toThrow('Disk full');
  expect(h.transceive).not.toHaveBeenCalled();
});
test('response persistence failure leaves an unknown attempt and no HTTP submission', async () => {
  const h = harness();
  local.db.exec(
    "CREATE TRIGGER simulate_disk_failure BEFORE UPDATE OF response_hex ON admin_commands BEGIN SELECT RAISE(ABORT,'Disk full');END;",
  );
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toThrow('Disk full');
  expect(h.transceive).toHaveBeenCalledTimes(1);
  expect(h.responseBodies).toHaveLength(0);
  expect((await local.store.commands(h.getSessionId(), context))[0].state).toBe(
    'ATTEMPTED',
  );
});
test('a login change during NFC still preserves the late physical response', async () => {
  const h = harness();
  h.transceive.mockImplementation(async () => {
    h.setContext({...context, sessionMarker: 'new-login'});
    return [0x91, 0];
  });
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toMatchObject({code: 'ADMIN_SESSAO_ALTERADA'});
  expect(h.responseBodies).toHaveLength(0);
  expect(
    (await local.store.commands(h.getSessionId(), context))[0].responseHex,
  ).toBe('9100');
});
test('cancellation after NFC preserves the response and sends no next command', async () => {
  const h = harness();
  let cancelled = false;
  h.transceive.mockImplementation(async () => {
    cancelled = true;
    return [0x91, 0];
  });
  h.checkpoint.mockImplementation(() => {
    if (cancelled) throw new Error('NFC cancelled');
  });
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toThrow('NFC cancelled');
  expect(
    (await local.store.commands(h.getSessionId(), context))[0].responseHex,
  ).toBe('9100');
  expect(h.responseBodies).toHaveLength(0);
});
test('restoration submits only the saved response, without opening NFC or transmitting a saved frame', async () => {
  await local.store.saveSession(session);
  await local.store.saveReply(session, reply());
  await local.store.attempt(session, frame);
  await local.store.response(session, frame, '9100');
  const h = harness();
  h.request.mockImplementation(async path => {
    if (path.endsWith('/respostas')) return reply(session.id, null);
    if (path.endsWith(`/operacoes/${operation.id}`)) return verified;
    throw new Error(path);
  });
  const native = jest.spyOn(h.nfc, 'run');
  expect((await h.coordinator.restore(operation)).alteracaoFisica).toBe(
    'CONFERIDA',
  );
  expect(native).not.toHaveBeenCalled();
  expect(h.transceive).not.toHaveBeenCalled();
  expect((await local.store.sessions(operation.id, context))[0].ended).toBe(
    true,
  );
});
test('unknown key 0 attempt is never replayed and requires an explicit material choice', async () => {
  const key: AdminCommand = {
    ...frame,
    etapa: 'TROCAR_CHAVE_0',
    apduHex: '90C400002900' + '00'.repeat(40) + '00',
    alteraTag: true,
  };
  await local.store.saveSession(session);
  await local.store.saveReply(session, reply(session.id, key));
  await local.store.attempt(session, key);
  const h = harness();
  h.setOperation({
    ...operation,
    status: 'INTERROMPIDA',
    alteracaoEmitida: true,
  });
  await h.coordinator.restore(operation);
  expect(h.transceive).not.toHaveBeenCalled();
  expect(
    await h.coordinator.suggestions({
      ...operation,
      status: 'INTERROMPIDA',
      alteracaoEmitida: true,
    }),
  ).toEqual([null, 'ATUAL', 'ATUAL', 'ATUAL', 'ATUAL']);
});
test('acknowledged key changes suggest ALVO while preserving explicit recovery', async () => {
  const key: AdminCommand = {
    ...frame,
    etapa: 'TROCAR_CHAVE_4',
    apduHex: '90C400002904' + '00'.repeat(40) + '00',
    alteraTag: true,
  };
  await local.store.saveSession(session);
  await local.store.saveReply(session, reply(session.id, key));
  await local.store.attempt(session, key);
  await local.store.response(session, key, '9100');
  await local.store.acknowledge(session, key, reply(session.id, null));
  expect(await harness().coordinator.suggestions(verified)).toEqual([
    'ATUAL',
    'ATUAL',
    'ATUAL',
    'ATUAL',
    'ALVO',
  ]);
});
test('another login cannot submit an old RF response and interrupts it before new recovery', async () => {
  await local.store.saveSession(session);
  await local.store.saveReply(session, reply());
  await local.store.attempt(session, frame);
  await local.store.response(session, frame, '9100');
  const h = harness();
  h.setContext({...context, sessionMarker: 'new-login'});
  await h.coordinator.restore(operation);
  expect(h.responseBodies).toHaveLength(0);
  expect(
    h.request.mock.calls.some(([path]) => path.endsWith('/interrupcao')),
  ).toBe(true);
});
test('network and restart retain original RF identifiers and response content', async () => {
  const h = harness();
  h.setFailures(2, true);
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toThrow('Rede indisponível');
  const old = (await local.store.sessions(operation.id, context))[0];
  expect(old.ended).toBe(false);
  h.setFailures(0);
  const native = jest.spyOn(h.nfc, 'run');
  native.mockClear();
  await h.coordinator.restore(operation);
  expect(native).not.toHaveBeenCalled();
  expect(h.responseBodies[2]).toEqual(h.responseBodies[0]);
});
test('activation reads after configuration in a separate native session and recovers a lost HTTP reply', async () => {
  await local.store.saveOperation(verified, context);
  const h = harness();
  h.request.mockImplementation(async path => {
    if (path.endsWith('/ativacao')) throw unavailable();
    if (path.endsWith(`/provisionamentos/${provisioning.id}`))
      return {...provisioning, status: 'ATIVA'};
    throw new Error(path);
  });
  expect(
    (await h.coordinator.activate(verified, provisioning, true)).status,
  ).toBe('ATIVA');
  expect(h.nfc.read).toHaveBeenCalledTimes(1);
  expect(h.transceive).not.toHaveBeenCalled();
  await h.coordinator.activate(verified, provisioning, true);
  expect(h.nfc.read).toHaveBeenCalledTimes(1);
});
test('activation retry uses the stored reading without another NFC session', async () => {
  await local.store.saveOperation(verified, context);
  const h = harness();
  h.request.mockRejectedValue(unavailable());
  await expect(
    h.coordinator.activate(verified, provisioning, true),
  ).rejects.toThrow('Rede indisponível');
  expect(await h.coordinator.activationPending(verified)).toBe(true);
  h.request.mockResolvedValue({...provisioning, status: 'ATIVA'});
  await h.coordinator.activate(verified, provisioning, true);
  expect(h.nfc.read).toHaveBeenCalledTimes(1);
});
test('a divergent static reading does not poison the durable activation slot', async () => {
  const op = {
      ...verified,
      plano: {...verified.plano, estrategia: 'NDEF_ESTATICO' as const},
    },
    p = {
      ...provisioning,
      estrategia: 'NDEF_ESTATICO' as const,
      referenciaNdef: `urn:nfc-trace:provisioning:${provisioning.id}`,
    };
  const h = harness();
  jest.mocked(h.nfc.read).mockResolvedValue({uid: p.uid, ndef: 'wrong'});
  await expect(h.coordinator.activate(op, p, true)).rejects.toThrow('diverge');
  expect(await local.store.activation(op.id, context)).toBeNull();
});
test('transport refuses a concurrent execution and expired RF checkpoints', async () => {
  const h = harness();
  h.request.mockImplementation(async path =>
    path.endsWith('/sessoes')
      ? {...reply(id(102)), expiraEm: new Date(now - 1).toISOString()}
      : {},
  );
  const first = h.coordinator.execute(operation, materials, () => {});
  await expect(
    h.coordinator.execute(operation, materials, () => {}),
  ).rejects.toMatchObject({code: 'ADMIN_EM_ANDAMENTO'});
  await expect(first).rejects.toMatchObject({code: 'ADMIN_RF_EXPIRADA'});
  expect(h.transceive).not.toHaveBeenCalled();
});
