/* eslint-env node */
/* global pm */
// Contract fixture for local native UI verification; see ../../README.md.
const http = require('node:http');
const {randomUUID} = require('node:crypto');
const statePrefix = 'nova-tag-ui.';
const fixtureToken = 'nfc_' + 'a'.repeat(43);
const fixtureUser = {
  id: '00000000-0000-4000-8000-000000000001',
  login: 'standards.admin',
  nome: 'Administrador de teste',
  perfil: 'ADMINISTRADOR',
};
const expiresAt = '2030-01-01T00:00:00.000Z';
function seedOrders() {
  return Array.from({length: 500}, (_unused, index) => ({
    id: '00000000-0000-4000-8000-' + String(index + 100).padStart(12, '0'),
    codigo: 'PADRAO-' + String(index + 1).padStart(4, '0'),
    descricao: 'Volume para verificar seleção, rolagem e fonte ampliada.',
    estado: 'CADASTRADO',
    expedido: false,
    versao: 1,
    criadoEm: '2026-10-23T12:00:00.000Z',
  }));
}
http
  .createServer(async (request, response) => {
    const correlationId = randomUUID();
    const url = new URL(request.url, 'http://localhost');
    const route = url.pathname.startsWith('/v1')
        ? '/api' + url.pathname
        : url.pathname,
      method = request.method,
      body = request.body ?? {};
    function reply(status, data) {
      response.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'x-correlation-id': correlationId,
      });
      response.end(JSON.stringify(data));
    }
    function success(data, status = 200) {
      reply(status, {
        sucesso: true,
        mensagem: 'Solicitação processada.',
        dados: data,
      });
    }
    function failure(status, code, message) {
      reply(status, {
        sucesso: false,
        codigo: code,
        mensagem: message,
        correlacaoId: correlationId,
      });
    }
    if (method === 'POST' && route === '/__fixture/reset') {
      await pm.state.set(statePrefix + 'orders', seedOrders());
      await pm.state.set(statePrefix + 'authenticated', false);
      return success({reset: true});
    }
    if (method === 'POST' && route === '/api/v1/autenticacao/login') {
      if (
        body.login !== fixtureUser.login ||
        body.senha !== 'fixture-only-password'
      )
        return failure(
          401,
          'CREDENCIAIS_INVALIDAS',
          'Login ou senha inválidos.',
        );
      await pm.state.set(statePrefix + 'authenticated', true);
      return success(
        {usuario: fixtureUser, expiraEm: expiresAt, tokenAcesso: fixtureToken},
        201,
      );
    }
    const modeledRoute =
      [
        '/api/v1/autenticacao/sessao',
        '/api/v1/autenticacao/logout',
        '/api/v1/pedidos',
      ].includes(route) ||
      /^\/api\/v1\/pedidos\/[^/]+(?:\/eventos)?$/.test(route);
    if (!modeledRoute)
      return failure(
        501,
        'FIXTURE_NAO_MODELADA',
        'Rota fora do escopo desta simulação.',
      );
    if (
      request.headers.authorization !== 'Bearer ' + fixtureToken ||
      !(await pm.state.get(statePrefix + 'authenticated'))
    )
      return failure(401, 'SESSAO_INVALIDA', 'Entre novamente.');
    if (method === 'GET' && route === '/api/v1/autenticacao/sessao')
      return success({usuario: fixtureUser, expiraEm: expiresAt});
    if (method === 'POST' && route === '/api/v1/autenticacao/logout') {
      await pm.state.set(statePrefix + 'authenticated', false);
      return success({encerrada: true});
    }
    let orders = await pm.state.get(statePrefix + 'orders');
    if (!orders) {
      orders = seedOrders();
      await pm.state.set(statePrefix + 'orders', orders);
    }
    if (method === 'GET' && route === '/api/v1/pedidos') {
      const search = (url.searchParams.get('busca') ?? '').toLowerCase();
      const page = Number(url.searchParams.get('pagina') ?? '1'),
        limit = Number(url.searchParams.get('limite') ?? '10');
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      )
        return failure(400, 'ENTRADA_INVALIDA', 'Paginação inválida.');
      const matching = orders.filter(order =>
        (order.codigo + ' ' + (order.descricao ?? ''))
          .toLowerCase()
          .includes(search),
      );
      return success({
        itens: matching.slice((page - 1) * limit, page * limit),
        total: matching.length,
        pagina: page,
        limite: limit,
      });
    }
    if (method === 'POST' && route === '/api/v1/pedidos') {
      if (
        typeof body.codigo !== 'string' ||
        !/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(body.codigo) ||
        (body.descricao !== undefined &&
          (typeof body.descricao !== 'string' || body.descricao.length > 500))
      )
        return failure(
          400,
          'ENTRADA_INVALIDA',
          'Confira os campos e formatos enviados.',
        );
      if (orders.some(order => order.codigo === body.codigo))
        return failure(
          409,
          'CODIGO_PEDIDO_DUPLICADO',
          'Esse código já existe.',
        );
      const order = {
        id: randomUUID(),
        codigo: body.codigo,
        descricao: body.descricao ?? null,
        estado: 'CADASTRADO',
        expedido: false,
        versao: 1,
        criadoEm: new Date().toISOString(),
      };
      await pm.state.set(statePrefix + 'orders', [order, ...orders]);
      return success(order, 201);
    }
    const orderMatch = route.match(/^\/api\/v1\/pedidos\/([^/]+)(\/eventos)?$/);
    if (method === 'GET' && orderMatch) {
      const order = orders.find(candidate => candidate.id === orderMatch[1]);
      if (!order)
        return failure(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
      if (orderMatch[2])
        return success({itens: [], total: 0, pagina: 1, limite: 20});
      return success({...order, provisionamentoVigente: null});
    }
    return failure(
      501,
      'FIXTURE_NAO_MODELADA',
      'Método fora do escopo desta simulação.',
    );
  })
  .listen(process.env.PORT);
