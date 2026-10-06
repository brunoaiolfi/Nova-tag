import {SessionError, Transport} from '../../domain/auth/types';

export class HttpTransport implements Transport {
  constructor(
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}
  async send<T>(
    baseUrl: string,
    path: string,
    options: {token?: string; body?: unknown; method?: string} = {},
  ): Promise<T> {
    if (!/^\/[a-zA-Z0-9/_?=&%.-]*$/.test(path) || path.startsWith('//')) {
      throw new SessionError('ROTA_INVALIDA', 'Rota de API inválida.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.fetcher(baseUrl + path, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          ...(options.body !== undefined
            ? {'Content-Type': 'application/json'}
            : {}),
          ...(options.token ? {Authorization: 'Bearer ' + options.token} : {}),
        },
        ...(options.body !== undefined
          ? {body: JSON.stringify(options.body)}
          : {}),
      });
      const payload: unknown = await response.json().catch(() => undefined);
      const envelope =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : undefined;
      if (!response.ok) {
        const fallback =
          response.status === 401
            ? [
                'SESSAO_INVALIDA',
                'Sua sessão expirou ou foi revogada. Entre novamente.',
              ]
            : response.status === 403
            ? ['ACESSO_NEGADO', 'Seu perfil não permite esta operação.']
            : ['ERRO_API', 'A solicitação não foi aceita. Tente novamente.'];
        throw new SessionError(
          typeof envelope?.codigo === 'string' ? envelope.codigo : fallback[0],
          typeof envelope?.mensagem === 'string'
            ? envelope.mensagem
            : fallback[1],
          response.status,
        );
      }
      if (!envelope || envelope.sucesso !== true || !('dados' in envelope)) {
        throw new SessionError(
          'RESPOSTA_INVALIDA',
          'Resposta inesperada da API.',
        );
      }
      return envelope.dados as T;
    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }
      throw new SessionError(
        'API_INDISPONIVEL',
        'Não foi possível acessar a API. Confira a conexão e o endereço.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
