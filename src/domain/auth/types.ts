export type Role = 'ADMINISTRADOR' | 'OPERADOR' | 'CONSULTA';
export interface User {
  id: string;
  login: string;
  nome: string;
  perfil: Role;
}
export interface Session {
  token: string;
  expiresAt: string;
  user: User;
  baseUrl: string;
}
export interface SessionStorage {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}
export interface Transport {
  send<T>(
    baseUrl: string,
    path: string,
    options?: {token?: string; body?: unknown; method?: string},
  ): Promise<T>;
}
export class SessionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SessionError';
  }
}
export function normalizeApiUrl(value: string, development: boolean): string {
  try {
    const url = new URL(value.trim());
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(development && url.protocol === 'http:')) ||
      url.pathname.replace(/\/$/, '') !== '/api/v1'
    ) {
      throw new Error('invalid');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new SessionError(
      'URL_INVALIDA',
      'Informe a URL da API terminando em /api/v1. HTTPS é obrigatório fora do desenvolvimento.',
    );
  }
}
export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const s = value as Partial<Session>;
  return (
    typeof s.token === 'string' &&
    /^nfc_[A-Za-z0-9_-]{43}$/.test(s.token) &&
    typeof s.expiresAt === 'string' &&
    Number.isFinite(Date.parse(s.expiresAt)) &&
    typeof s.baseUrl === 'string' &&
    !!s.user &&
    typeof s.user.id === 'string' &&
    typeof s.user.login === 'string' &&
    typeof s.user.nome === 'string' &&
    ['ADMINISTRADOR', 'OPERADOR', 'CONSULTA'].includes(s.user.perfil)
  );
}
