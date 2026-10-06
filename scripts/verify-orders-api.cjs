/* eslint-env node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID, randomBytes} = require('node:crypto');
const {execFileSync} = require('node:child_process');
let phase = 'configuração';

async function main() {
  const fixturePath = process.env.AUTH_ACCEPTANCE_FILE;
  assert(
    fixturePath,
    'Defina AUTH_ACCEPTANCE_FILE com contas exclusivas da API de teste na porta 3110.',
  );
  const fixture = JSON.parse(
    fs.readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, ''),
  );
  const origin = new URL(fixture.baseUrl);
  assert(
    ['127.0.0.1', 'localhost'].includes(origin.hostname) &&
      origin.port === '3110' &&
      origin.pathname === '/api/v1',
    'Este aceite opera somente a API isolada de testes na porta 3110.',
  );
  const root = path.resolve(__dirname, '..');
  phase = 'compilação do cliente';
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
      '--skipLibCheck',
      '--rootDir',
      'src',
      '--outDir',
      '.tmp/orders-contract',
      'src/appplication/traceability/workflow.ts',
      'src/appplication/auth/session-manager.ts',
      'src/infra/auth/http-transport.ts',
    ],
    {cwd: root, stdio: 'pipe'},
  );
  const {
    TraceabilityWorkflow,
  } = require('../.tmp/orders-contract/appplication/traceability/workflow');
  const {
    SessionManager,
  } = require('../.tmp/orders-contract/appplication/auth/session-manager');
  const {
    HttpTransport,
  } = require('../.tmp/orders-contract/infra/auth/http-transport');
  const {SessionError} = require('../.tmp/orders-contract/domain/auth/types');
  const managers = [];
  async function session(role) {
    const user = fixture.users.find(item => item.role === role);
    assert(user, 'Falta conta de teste do perfil ' + role);
    let saved = null;
    const manager = new SessionManager(
      {
        load: async () => saved,
        save: async value => {
          saved = value;
        },
        clear: async () => {
          saved = null;
        },
      },
      new HttpTransport(),
      true,
    );
    managers.push(manager);
    await manager.login(fixture.baseUrl, user.login, user.password);
    return {manager, user};
  }
  try {
    phase = 'login administrativo';
    const {manager, user} = await session('ADMINISTRADOR');
    let lostPath;
    const workflow = new TraceabilityWorkflow({
      request: async (route, options) => {
        const result = await manager.request(route, options);
        if (route === lostPath) {
          lostPath = undefined;
          // Fault injection only after the real HTTP transaction committed.
          throw new SessionError(
            'API_INDISPONIVEL',
            'Resposta perdida após o commit (aceite).',
          );
        }
        return result;
      },
    });
    const prefix = 'CONTRATO-' + randomUUID().slice(0, 8).toUpperCase();
    for (const strategy of ['UID', 'NDEF_ESTATICO']) {
      phase = strategy + ': cadastro e recuperação';
      const uid = '04' + randomBytes(6).toString('hex').toUpperCase();
      const input = {
        codigo: prefix + '-' + strategy,
        descricao: 'Fixture de contrato; sem captura NFC física',
      };
      lostPath = '/pedidos';
      const first = await workflow.createOrder(input, user.id);
      assert.equal(first.recovered, true);
      assert.equal(first.order.codigo, input.codigo);
      await assert.rejects(
        workflow.createOrder(input, user.id),
        error => error.code === 'CODIGO_PEDIDO_DUPLICADO',
      );
      const descriptionSearch = await workflow.listOrders(input.descricao);
      assert(descriptionSearch.itens.some(item => item.id === first.order.id));
      phase = strategy + ': provisionamento e captura';
      const pending = await workflow.register(
        first.order.codigo,
        {uid},
        strategy,
        'FIXTURE_SEM_HARDWARE',
      );
      assert.equal(pending.status, 'REGISTRADA');
      assert.equal(
        (await workflow.order(first.order.id)).provisionamentoVigente.id,
        pending.id,
      );
      // Synthetic long-form URI NDEF: exact bytes differ from SDK's usual SR
      // encoding. This is a contract fixture, never a physical NFC observation.
      const uri = pending.referenciaNdef ?? 'urn:fixture:uid';
      const payload = Buffer.concat([
        Buffer.from([0]),
        Buffer.from(uri, 'utf8'),
      ]);
      const evidence = Buffer.concat([
        Buffer.from([0xc1, 1, 0, 0, 0, payload.length, 0x55]),
        payload,
      ]);
      const reading = {
        uid,
        ndef: uri,
        bytesBase64: evidence.toString('base64'),
        tecnologias: ['IsoDep'],
      };
      await workflow.activate(pending, reading, true);
      await workflow.activate(pending, reading, true);
      const observation = await workflow.prepare(
        reading,
        'COLETA',
        randomUUID(),
        new Date().toISOString(),
        'fixture-contrato-sem-hardware',
      );
      lostPath = '/eventos';
      await assert.rejects(
        workflow.send(observation, user.id),
        error => error.code === 'API_INDISPONIVEL',
      );
      assert.equal(
        (await workflow.send(observation, user.id)).decisao.autorizada,
        true,
      );
      const stored = await manager.request('/eventos/' + observation.id);
      assert.deepEqual(
        Buffer.from(stored.leituraBruta.bytesBase64, 'base64'),
        evidence,
      );
      await assert.rejects(
        workflow.send(
          {
            ...observation,
            leituraBruta: {
              ...reading,
              bytesBase64: Buffer.concat([
                Buffer.from([0xd1, 1, payload.length, 0x55]),
                payload,
              ]).toString('base64'),
            },
          },
          user.id,
        ),
        error => error.code === 'IDEMPOTENCIA_CONFLITO' && error.status === 409,
      );
      const before = await workflow.history(first.order.id);
      assert.equal(
        before.itens.filter(item => item.tipo === 'PROVISIONAMENTO').length,
        1,
      );
      assert.equal(
        before.itens.filter(item => item.tipo === 'COLETA').length,
        1,
      );
      lostPath = '/provisionamentos/' + pending.id + '/encerramento';
      phase = strategy + ': encerramento após resposta perdida';
      const closed = await workflow.closeProvisioning(pending, user.id);
      assert.equal(closed.status, 'DESPROVISIONADA');
      assert.equal((await workflow.order(first.order.id)).estado, 'COLETADO');
      assert.equal(
        (await workflow.order(first.order.id)).provisionamentoVigente,
        null,
      );
      assert.deepEqual(
        (await workflow.history(first.order.id)).itens,
        before.itens,
      );
      const nextOrder = await workflow.createOrder(
        {codigo: input.codigo + '-2'},
        user.id,
      );
      phase = strategy + ': reutilização e preservação da época anterior';
      const next = await workflow.register(
        nextOrder.order.codigo,
        {uid},
        strategy,
        'FIXTURE_SEM_HARDWARE',
      );
      assert.equal(next.epoca, pending.epoca + 1);
      assert.notEqual(next.id, pending.id);
      const nextReading = {
        uid,
        ...(next.referenciaNdef ? {ndef: next.referenciaNdef} : {}),
      };
      await workflow.activate(next, nextReading, true);
      await workflow.closeProvisioning(pending, user.id); // Retry the exact old ID.
      assert.equal((await workflow.tag(uid)).id, next.id);
      assert.equal((await workflow.tag(uid)).status, 'ATIVA');
      const oldCapture = {...observation, id: randomUUID()};
      const rejection = await workflow.send(oldCapture, user.id);
      assert.equal(rejection.armazenada, true);
      assert.equal(rejection.decisao.autorizada, false);
      assert.equal(rejection.decisao.motivo, 'VINCULO_INATIVO');
      for (const role of ['OPERADOR', 'CONSULTA']) {
        phase = strategy + ': permissões ' + role;
        const unauthorized = await session(role);
        const deniedWorkflow = new TraceabilityWorkflow(unauthorized.manager);
        await assert.rejects(
          deniedWorkflow.closeProvisioning(next, unauthorized.user.id),
          error => error.code === 'ACESSO_NEGADO' && error.status === 403,
        );
        await assert.rejects(
          deniedWorkflow.createOrder(
            {codigo: input.codigo + '-' + role},
            unauthorized.user.id,
          ),
          error => error.code === 'ACESSO_NEGADO' && error.status === 403,
        );
        await unauthorized.manager.logout();
      }
      assert.equal((await workflow.tag(uid)).status, 'ATIVA');
    }
    console.log(
      'PASS: cliente/API/PostgreSQL reais, pedidos, busca, bytes originais da fixture, resposta perdida, conflito de bytes, encerramento, nova época UID/NDEF, histórico e permissões. Leituras são fixtures de contrato, sem aceite físico.',
    );
  } finally {
    for (const manager of managers) {
      await manager.logout();
    }
  }
}
main().catch(error => {
  // Avoid accidentally publishing tokens or fixture credentials in diagnostics.
  console.error(
    'Aceite de pedidos/vínculos falhou em ' +
      phase +
      '. Confira a API isolada, contas e contratos locais.',
  );
  const code =
    error && typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : undefined;
  const location =
    typeof error?.stack === 'string'
      ? error.stack
          .split('\n')
          .find(line => line.includes('verify-orders-api.cjs:'))
          ?.trim()
      : undefined;
  console.error(
    JSON.stringify({
      code,
      status: typeof error?.status === 'number' ? error.status : undefined,
      location,
    }),
  );
  process.exitCode = 1;
});
