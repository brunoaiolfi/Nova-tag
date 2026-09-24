import {SessionManager} from '../src/appplication/auth/session-manager';
import {
  Session,
  SessionError,
  SessionStorage,
  Transport,
} from '../src/domain/auth/types';
import {HttpTransport} from '../src/infra/auth/http-transport';

const baseUrl = 'http://127.0.0.1:3000/api/v1';
const session: Session = {
  baseUrl,
  token: 'nfc_' + 'a'.repeat(43),
  expiresAt: '2030-01-01T12:00:00Z',
  user: {
    id: 'user-a',
    nome: 'Operador A',
    login: 'operador.a',
    perfil: 'OPERADOR',
  },
};
const nextSession: Session = {
  ...session,
  token: 'nfc_' + 'b'.repeat(43),
  user: {...session.user, id: 'user-b', login: 'operador.b'},
};
const result = (s = session) => ({
  tokenAcesso: s.token,
  expiraEm: s.expiresAt,
  usuario: s.user,
});
function setup(saved: Session | null = null) {
  const storage: jest.Mocked<SessionStorage> = {
    load: jest.fn().mockResolvedValue(saved),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const send = jest.fn();
  const transport = {send} as Transport;
  const manager = new SessionManager(storage, transport, true, () =>
    Date.parse('2029-01-01T12:00:00Z'),
  );
  return {storage, send, manager};
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {promise, resolve, reject};
}

describe('Session lifecycle and operator isolation', () => {
  it('stores the session securely before publishing authentication, never the password', async () => {
    const {manager, storage, send} = setup();
    const save = deferred<void>();
    storage.save.mockReturnValueOnce(save.promise);
    send.mockResolvedValueOnce(result());
    const login = manager.login(baseUrl, ' Operador.A ', 'the-password');
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.getSnapshot().status).not.toBe('authenticated');
    save.resolve();
    await login;
    expect(manager.getSnapshot()).toEqual({status: 'authenticated', session});
    expect(storage.save).toHaveBeenCalledWith(session);
    expect(JSON.stringify(storage.save.mock.calls)).not.toContain(
      'the-password',
    );
    expect(send).toHaveBeenCalledWith(baseUrl, '/autenticacao/login', {
      method: 'POST',
      body: {login: 'operador.a', senha: 'the-password'},
    });
  });
  it('restores only after verifying the stored token with the server', async () => {
    const {manager, send} = setup(session);
    send.mockResolvedValueOnce({
      usuario: session.user,
      expiraEm: session.expiresAt,
    });
    await manager.restore();
    expect(manager.getSnapshot().status).toBe('authenticated');
    expect(send).toHaveBeenCalledWith(baseUrl, '/autenticacao/sessao', {
      token: session.token,
    });
  });
  it('keeps saved credentials on a transient network failure so the operator can retry', async () => {
    const {manager, storage, send} = setup(session);
    send.mockRejectedValueOnce(new SessionError('API_INDISPONIVEL', 'offline'));
    await manager.restore();
    expect(manager.getSnapshot().status).toBe('unavailable');
    expect(storage.clear).not.toHaveBeenCalled();
    send.mockResolvedValueOnce({
      usuario: session.user,
      expiraEm: session.expiresAt,
    });
    await manager.restore();
    expect(manager.getSnapshot().status).toBe('authenticated');
  });
  it('clears an expired or revoked session and fails closed if secure storage cannot be cleared', async () => {
    const {manager, storage, send} = setup(session);
    storage.clear.mockRejectedValueOnce(new Error('keystore unavailable'));
    send.mockRejectedValueOnce(
      new SessionError('SESSAO_INVALIDA', 'revoked', 401),
    );
    await expect(manager.restore()).resolves.toBeUndefined();
    expect(manager.getSnapshot().status).toBe('anonymous');
    const expired = setup({...session, expiresAt: '2020-01-01T12:00:00Z'});
    await expired.manager.restore();
    expect(expired.send).not.toHaveBeenCalled();
    expect(expired.storage.clear).toHaveBeenCalledTimes(1);
  });
  it('never retries a capture automatically on 401 and retains authentication on 403', async () => {
    const {manager, send} = setup();
    send.mockResolvedValueOnce(result());
    await manager.login(baseUrl, 'operador.a', 'password');
    send.mockRejectedValueOnce(
      new SessionError('ACESSO_NEGADO', 'forbidden', 403),
    );
    await expect(
      manager.request('/pedidos', {method: 'POST', body: {codigo: 'X'}}),
    ).rejects.toMatchObject({status: 403});
    expect(manager.getSnapshot().status).toBe('authenticated');
    send.mockRejectedValueOnce(
      new SessionError('SESSAO_INVALIDA', 'revoked', 401),
    );
    await expect(
      manager.request('/eventos', {method: 'POST', body: {id: 'frozen-id'}}),
    ).rejects.toMatchObject({status: 401});
    expect(manager.getSnapshot().status).toBe('anonymous');
    expect(send.mock.calls.filter(call => call[1] === '/eventos')).toHaveLength(
      1,
    );
  });
  it('rejects a queued capture belonging to another operator without sending it', async () => {
    const {manager, send} = setup();
    send.mockResolvedValueOnce(result(nextSession));
    await manager.login(baseUrl, 'operador.b', 'password');
    await expect(
      manager.request('/eventos', {
        expectedUserId: session.user.id,
        body: {id: 'original-id'},
      }),
    ).rejects.toMatchObject({code: 'OPERADOR_DIVERGENTE'});
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not invalidate a newer session when an old request later fails with 401', async () => {
    const {manager, send} = setup();
    send.mockResolvedValueOnce(result());
    await manager.login(baseUrl, 'operador.a', 'password');
    const pending = deferred<unknown>();
    send.mockReturnValueOnce(pending.promise);
    const request = manager.request('/pedidos');
    const outcome = request.then(
      value => ({value}),
      error => ({error}),
    );
    send.mockResolvedValueOnce(result(nextSession));
    await manager.login(baseUrl, 'operador.b', 'password');
    pending.reject(new SessionError('SESSAO_INVALIDA', 'old session', 401));
    expect(await outcome).toMatchObject({error: {status: 401}});
    expect(manager.getSnapshot().session?.user.id).toBe(nextSession.user.id);
  });
  it('discards results belonging to an operator whose session changed during the request', async () => {
    const {manager, send} = setup();
    send.mockResolvedValueOnce(result());
    await manager.login(baseUrl, 'operador.a', 'password');
    const pending = deferred<unknown>();
    send.mockReturnValueOnce(pending.promise);
    const request = manager.request('/pedidos');
    send.mockResolvedValueOnce(result(nextSession));
    await manager.login(baseUrl, 'operador.b', 'password');
    pending.resolve({privateResult: 'old'});
    await expect(request).rejects.toMatchObject({code: 'SESSAO_ALTERADA'});
  });
  it('logs out locally without network, reports unconfirmed remote revocation and only clears auth storage', async () => {
    const {manager, storage, send} = setup();
    send.mockResolvedValueOnce(result());
    await manager.login(baseUrl, 'operador.a', 'password');
    send.mockRejectedValueOnce(new SessionError('API_INDISPONIVEL', 'offline'));
    await manager.logout();
    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot()).toMatchObject({
      status: 'anonymous',
      message: expect.stringContaining('não foi confirmada'),
    });
  });
  it('does not resurrect a login that returns after logout', async () => {
    const {manager, storage, send} = setup();
    const pending = deferred<ReturnType<typeof result>>();
    send
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({encerrada: true});
    const login = manager.login(baseUrl, 'operador.a', 'password');
    await manager.logout();
    pending.resolve(result());
    await login;
    expect(manager.getSnapshot().status).toBe('anonymous');
    expect(storage.save).not.toHaveBeenCalled();
    expect(send).toHaveBeenLastCalledWith(baseUrl, '/autenticacao/logout', {
      method: 'POST',
      token: session.token,
    });
  });
  it('rejects insecure production URLs and never persists a session when secure storage fails', async () => {
    const {manager, storage, send} = setup();
    storage.save.mockRejectedValueOnce(new Error('unavailable'));
    send
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce({encerrada: true});
    await expect(
      manager.login(baseUrl, 'operador.a', 'password'),
    ).rejects.toMatchObject({code: 'ARMAZENAMENTO_INDISPONIVEL'});
    expect(manager.getSnapshot().status).not.toBe('authenticated');
    const production = new SessionManager(storage, {send} as Transport, false);
    await expect(
      production.login(baseUrl, 'operador.a', 'password'),
    ).rejects.toMatchObject({code: 'URL_INVALIDA'});
  });
});

describe('HTTP transport', () => {
  it('uses the opaque token, sends the frozen payload once and forbids redirects', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({sucesso: true, dados: {armazenada: true}}),
    });
    const transport = new HttpTransport(fetcher);
    const body = {id: 'client-id', operadorId: 'declared'};
    await expect(
      transport.send(baseUrl, '/eventos', {
        token: session.token,
        method: 'POST',
        body,
      }),
    ).resolves.toEqual({armazenada: true});
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: 'error',
      headers: {Authorization: 'Bearer ' + session.token},
      body: JSON.stringify(body),
    });
    await expect(
      transport.send(baseUrl, '//other-server', {token: session.token}),
    ).rejects.toMatchObject({code: 'ROTA_INVALIDA'});
  });
  it('retains stable error codes and never puts credentials in thrown errors', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        codigo: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'Login ou senha inválidos.',
      }),
    });
    await expect(
      new HttpTransport(fetcher).send(baseUrl, '/autenticacao/login', {
        body: {senha: 'do-not-log'},
      }),
    ).rejects.toMatchObject({code: 'CREDENCIAIS_INVALIDAS', status: 401});
  });
});
