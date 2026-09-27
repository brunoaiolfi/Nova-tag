import {
  isSession,
  normalizeApiUrl,
  Session,
  SessionError,
  SessionStorage,
  Transport,
  User,
} from '../../domain/auth/types';

export type AuthSnapshot =
  | {status: 'checking'; session?: Session; message?: string}
  | {status: 'anonymous'; session?: undefined; message?: string}
  | {status: 'authenticated'; session: Session; message?: string}
  | {status: 'unavailable'; session?: Session; message: string};
type LoginResult = {tokenAcesso: string; expiraEm: string; usuario: User};

export class SessionManager {
  private snapshot: AuthSnapshot = {status: 'checking'};
  private listeners = new Set<() => void>();
  private generation = 0;
  private writes: Promise<void> = Promise.resolve();
  constructor(
    private readonly storage: SessionStorage,
    private readonly transport: Transport,
    private readonly development: boolean,
    private readonly now: () => number = Date.now,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: AuthSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach(listener => listener());
  }
  private write(work: () => Promise<void>) {
    const result = this.writes.then(work);
    this.writes = result.catch(() => {});
    return result;
  }
  async restore() {
    const generation = ++this.generation;
    this.publish({status: 'checking'});
    let session: Session | null = null;
    try {
      await this.writes;
      const saved = await this.storage.load();
      if (generation !== this.generation) {
        return;
      }
      if (!saved) {
        this.publish({status: 'anonymous'});
        return;
      }
      if (!isSession(saved)) {
        throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
      }
      session = {
        ...saved,
        baseUrl: normalizeApiUrl(saved.baseUrl, this.development),
      };
      if (Date.parse(session.expiresAt) <= this.now()) {
        throw new SessionError(
          'SESSAO_EXPIRADA',
          'Sua sessão expirou. Entre novamente.',
          401,
        );
      }
      const result = await this.transport.send<{
        usuario: User;
        expiraEm: string;
      }>(session.baseUrl, '/autenticacao/sessao', {token: session.token});
      if (generation !== this.generation) {
        return;
      }
      if (result.usuario.id !== session.user.id) {
        throw new SessionError(
          'SESSAO_INVALIDA',
          'Identidade da sessão divergente. Entre novamente.',
          401,
        );
      }
      const verified = {
        ...session,
        user: result.usuario,
        expiresAt: result.expiraEm,
      };
      if (
        !isSession(verified) ||
        Date.parse(verified.expiresAt) <= this.now()
      ) {
        throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
      }
      await this.write(async () => {
        if (generation === this.generation) {
          await this.storage.save(verified);
        }
      });
      if (generation === this.generation) {
        this.publish({status: 'authenticated', session: verified});
      }
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      if (
        error instanceof SessionError &&
        (error.status === 401 || error.code === 'URL_INVALIDA')
      ) {
        await this.invalidate(generation, error.message);
      } else {
        this.publish({
          status: 'unavailable',
          ...(session ? {session} : {}),
          message:
            'Não foi possível verificar a sessão. Confira a conexão e tente novamente.',
        });
      }
    }
  }
  async login(baseUrl: string, login: string, password: string) {
    const url = normalizeApiUrl(baseUrl, this.development);
    const generation = ++this.generation;
    const response = await this.transport.send<LoginResult>(
      url,
      '/autenticacao/login',
      {
        method: 'POST',
        body: {login: login.trim().toLowerCase(), senha: password},
      },
    );
    const session: Session = {
      baseUrl: url,
      token: response.tokenAcesso,
      expiresAt: response.expiraEm,
      user: response.usuario,
    };
    if (!isSession(session) || Date.parse(session.expiresAt) <= this.now()) {
      throw new SessionError(
        'RESPOSTA_INVALIDA',
        'A API retornou uma sessão inválida.',
      );
    }
    if (generation !== this.generation) {
      await this.revoke(session);
      return;
    }
    try {
      await this.write(async () => {
        if (generation === this.generation) {
          await this.storage.save(session);
        }
      });
    } catch {
      await this.revoke(session);
      throw new SessionError(
        'ARMAZENAMENTO_INDISPONIVEL',
        'Não foi possível guardar a sessão com segurança.',
      );
    }
    if (generation === this.generation) {
      this.publish({status: 'authenticated', session});
    } else {
      await this.revoke(session);
    }
  }
  async request<T>(
    path: string,
    options?: {body?: unknown; method?: string; expectedUserId?: string},
  ): Promise<T> {
    const state = this.snapshot;
    if (state.status !== 'authenticated') {
      throw new SessionError(
        'SESSAO_NECESSARIA',
        'Entre novamente para enviar dados.',
        401,
      );
    }
    const session = state.session;
    const generation = this.generation;
    if (Date.parse(session.expiresAt) <= this.now()) {
      await this.invalidate(generation, 'Sua sessão expirou. Entre novamente.');
      throw new SessionError('SESSAO_EXPIRADA', 'Entre novamente.', 401);
    }
    if (options?.expectedUserId && options.expectedUserId !== session.user.id) {
      throw new SessionError(
        'OPERADOR_DIVERGENTE',
        'Entre com o operador original para enviar esta captura.',
      );
    }
    try {
      const result = await this.transport.send<T>(session.baseUrl, path, {
        token: session.token,
        method: options?.method,
        body: options?.body,
      });
      if (generation !== this.generation) {
        throw new SessionError(
          'SESSAO_ALTERADA',
          'A sessão mudou durante a solicitação. Confira o resultado antes de tentar novamente.',
        );
      }
      return result;
    } catch (error) {
      if (
        error instanceof SessionError &&
        error.status === 401 &&
        generation === this.generation
      ) {
        await this.invalidate(
          generation,
          'Sua sessão expirou ou foi revogada. Entre novamente.',
        );
      }
      throw error;
    }
  }
  async expireIfNeeded() {
    const session = this.snapshot.session;
    if (session && Date.parse(session.expiresAt) <= this.now()) {
      await this.invalidate(
        this.generation,
        'Sua sessão expirou. Entre novamente.',
      );
    }
  }
  private async invalidate(generation: number, message: string) {
    if (generation !== this.generation) {
      return;
    }
    const next = ++this.generation;
    this.publish({status: 'anonymous', message});
    try {
      await this.write(async () => {
        if (next === this.generation) {
          await this.storage.clear();
        }
      });
    } catch {
      if (next === this.generation) {
        this.publish({
          status: 'anonymous',
          message:
            'Sessão inválida. Não foi possível limpar o armazenamento seguro; entre novamente.',
        });
      }
    }
  }
  private async revoke(session: Session) {
    try {
      await this.transport.send(session.baseUrl, '/autenticacao/logout', {
        method: 'POST',
        token: session.token,
      });
      return true;
    } catch (error) {
      return error instanceof SessionError && error.status === 401;
    }
  }
  async logout() {
    const session = this.snapshot.session;
    const generation = ++this.generation;
    this.publish({status: 'anonymous', message: 'Encerrando sessão…'});
    try {
      await this.write(() => this.storage.clear());
    } catch {
      if (generation === this.generation) {
        this.publish({
          status: 'anonymous',
          message:
            'Não foi possível apagar a sessão do armazenamento seguro. Tente novamente.',
        });
      }
      if (session) {
        await this.revoke(session);
      }
      return;
    }
    const revoked = session ? await this.revoke(session) : true;
    if (generation === this.generation) {
      this.publish({
        status: 'anonymous',
        message: revoked
          ? undefined
          : 'Sessão removida deste aparelho. Sem conexão, a revogação no servidor não foi confirmada.',
      });
    }
  }
}
