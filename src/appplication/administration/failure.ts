export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : 'ADMINISTRACAO_INTERROMPIDA';
}
