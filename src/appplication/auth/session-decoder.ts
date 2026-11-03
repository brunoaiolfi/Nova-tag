import {record, timestamp, oneOf} from '../../domain/validation/values';
import type {Session} from '../../domain/auth/session';
import type {User} from '../../domain/auth/user';
import {objectValue, textValue, invalidResponse} from '../contracts/values';

function decodeUser(input: unknown): User {
  const value = objectValue(input);
  if (!oneOf(value.perfil, ['ADMINISTRADOR', 'OPERADOR', 'CONSULTA']))
    invalidResponse();
  return {
    id: textValue(value.id),
    login: textValue(value.login),
    nome: textValue(value.nome),
    perfil: value.perfil,
  };
}
export function decodeSessionVerification(input: unknown) {
  const value = objectValue(input);
  return {
    usuario: decodeUser(value.usuario),
    expiraEm: textValue(value.expiraEm),
  };
}
export function decodeLogin(input: unknown) {
  const value = objectValue(input);
  return {
    ...decodeSessionVerification(value),
    tokenAcesso: textValue(value.tokenAcesso),
  };
}

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
