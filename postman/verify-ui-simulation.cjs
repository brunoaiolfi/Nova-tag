const assert = require('node:assert/strict');
const baseUrl = 'http://127.0.0.1:3115/api';
async function request(path, {body, token, method = 'GET'} = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: 'Bearer ' + token} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(5000),
  });
  return {status: response.status, data: await response.json()};
}
(async () => {
  assert.equal(
    (await request('/__fixture/reset', {method: 'POST'})).status,
    200,
  );
  assert.equal(
    (
      await request('/v1/autenticacao/login', {
        method: 'POST',
        body: {login: 'standards.admin', senha: 'wrong'},
      })
    ).status,
    401,
  );
  const login = await request('/v1/autenticacao/login', {
    method: 'POST',
    body: {login: 'standards.admin', senha: 'fixture-only-password'},
  });
  assert.equal(login.status, 201);
  assert.equal(login.data.sucesso, true);
  const token = login.data.dados.tokenAcesso;
  assert.equal(typeof token, 'string');
  assert.equal((await request('/v1/autenticacao/sessao', {token})).status, 200);
  const page = await request('/v1/pedidos?pagina=1&limite=10', {token});
  assert.equal(page.data.dados.total, 500);
  assert.equal(page.data.dados.itens.length, 10);
  assert.equal(
    (
      await request('/v1/pedidos', {
        method: 'POST',
        token,
        body: {codigo: 'invalid code'},
      })
    ).status,
    400,
  );
  const body = {codigo: 'NATIVE-VERIFY', descricao: 'Volume de teste'};
  const created = await request('/v1/pedidos', {
    method: 'POST',
    token,
    body,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.dados.descricao, body.descricao);
  const found = await request('/v1/pedidos?busca=NATIVE-VERIFY', {token});
  assert.equal(found.data.dados.total, 1);
  assert.equal(found.data.dados.itens[0].id, created.data.dados.id);
  assert.equal(
    (await request('/v1/pedidos', {method: 'POST', token, body})).status,
    409,
  );
  assert.equal(
    (
      await request('/v1/pedidos/00000000-0000-4000-8000-999999999999', {
        token,
      })
    ).status,
    404,
  );
  assert.equal((await request('/not-modeled', {token})).status, 501);
  assert.equal(
    (await request('/v1/autenticacao/logout', {method: 'POST', token})).status,
    200,
  );
  assert.equal((await request('/v1/autenticacao/sessao', {token})).status, 401);
  await request('/__fixture/reset', {method: 'POST'});
  process.stdout.write(
    'UI fixture: auth, validation, pagination, POST/GET, conflict, missing ID, unknown route and logout passed.\n',
  );
})().catch(error => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
