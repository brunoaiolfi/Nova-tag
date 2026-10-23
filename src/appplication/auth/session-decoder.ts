import {record, timestamp, oneOf} from '../../domain/validation/values';
import type {Session} from '../../domain/auth/session';

export function isSession(value: unknown): value is Session {
  return (
    record(value) &&
    typeof value.token === 'string' &&
    /^nfc_[A-Za-z0-9_-]{43}$/.test(value.token) &&
    timestamp(value.expiresAt) &&
    typeof value.baseUrl === 'string' &&
    (value.verifiedAt === undefined || timestamp(value.verifiedAt)) &&
    record(value.user) &&
    typeof value.user.id === 'string' &&
    typeof value.user.login === 'string' &&
    typeof value.user.nome === 'string' &&
    oneOf(value.user.perfil, ['ADMINISTRADOR', 'OPERADOR', 'CONSULTA'])
  );
}
