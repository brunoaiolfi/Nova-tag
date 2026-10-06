/* eslint-env node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

async function main() {
  const fixturePath = process.env.AUTH_ACCEPTANCE_FILE;
  if (!fixturePath) {
    throw new Error(
      'Defina AUTH_ACCEPTANCE_FILE com um arquivo local de contas exclusivas de teste.',
    );
  }
  const fixture = JSON.parse(
    fs.readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, ''),
  );
  const origin = new URL(fixture.baseUrl);
  assert(
    ['127.0.0.1', 'localhost'].includes(origin.hostname),
    'O aceite só pode operar uma API local de teste.',
  );
  const roles = ['ADMINISTRADOR', 'OPERADOR', 'CONSULTA'];
  assert.deepEqual(
    fixture.users.map(user => user.role).sort(),
    [...roles].sort(),
  );
  const root = path.resolve(__dirname, '..');
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
      '.tmp/auth-contract',
      'src/domain/auth/types.ts',
      'src/appplication/auth/session-manager.ts',
      'src/infra/auth/http-transport.ts',
    ],
    {cwd: root, stdio: 'pipe'},
  );
  const {
    SessionManager,
  } = require('../.tmp/auth-contract/appplication/auth/session-manager');
  const {
    HttpTransport,
  } = require('../.tmp/auth-contract/infra/auth/http-transport');
  const managers = [];
  try {
    for (const user of fixture.users) {
      let stored = null;
      const storage = {
        load: async () => stored,
        save: async value => {
          stored = value;
        },
        clear: async () => {
          stored = null;
        },
      };
      const manager = new SessionManager(storage, new HttpTransport(), true);
      managers.push({manager, user, storage});
      await manager.login(fixture.baseUrl, user.login, user.password);
      assert.equal(manager.getSnapshot().session.user.perfil, user.role);
      assert.equal(manager.getSnapshot().session.user.id, user.id);
      await manager.request('/pedidos?pagina=1&limite=1');
      const restored = new SessionManager(storage, new HttpTransport(), true);
      await restored.restore();
      assert.equal(restored.getSnapshot().status, 'authenticated');
      if (user.role !== 'ADMINISTRADOR') {
        await assert.rejects(
          manager.request('/pedidos', {
            method: 'POST',
            body: {codigo: 'ACEITE-NAO-AUTORIZADO'},
          }),
          error => error.status === 403,
        );
        assert.equal(manager.getSnapshot().status, 'authenticated');
      }
    }
    const admin = managers.find(entry => entry.user.role === 'ADMINISTRADOR');
    const operator = managers.find(entry => entry.user.role === 'OPERADOR');
    const viewer = managers.find(entry => entry.user.role === 'CONSULTA');
    await admin.manager.request(`/usuarios/${operator.user.id}/revogacao`, {
      method: 'POST',
    });
    await assert.rejects(
      operator.manager.request('/pedidos'),
      error => error.status === 401,
    );
    assert.equal(operator.manager.getSnapshot().status, 'anonymous');
    assert.equal(await operator.storage.load(), null);
    const viewerToken = viewer.manager.getSnapshot().session.token;
    await viewer.manager.logout();
    const denied = await fetch(fixture.baseUrl + '/autenticacao/sessao', {
      headers: {Authorization: 'Bearer ' + viewerToken},
    });
    assert.equal(denied.status, 401);
    assert.equal(await viewer.storage.load(), null);
    console.log(
      'PASS: cliente HTTP real, três perfis, restauração, 403 sem logout, revogação 401 e logout remoto.',
    );
  } finally {
    await Promise.allSettled(managers.map(entry => entry.manager.logout()));
  }
}
main().catch(() => {
  // Não imprimir respostas, tokens, credenciais ou mensagens de erro do servidor.
  console.error(
    'Aceite de autenticação falhou. Confira API de teste, contas, tipos e configuração local.',
  );
  process.exitCode = 1;
});
