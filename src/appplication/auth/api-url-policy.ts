import {SessionError} from './session-error';

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
