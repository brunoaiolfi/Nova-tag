import {SessionError} from '../auth/session-error';
import {record} from '../../domain/validation/values';

export function invalidResponse(): never {
  throw new SessionError(
    'RESPOSTA_INVALIDA',
    'Resposta incompatível com o contrato.',
  );
}
export function objectValue(value: unknown): Record<string, unknown> {
  if (!record(value)) invalidResponse();
  return value;
}
export function textValue(value: unknown): string {
  if (typeof value !== 'string') invalidResponse();
  return value;
}
export function booleanValue(value: unknown): boolean {
  if (typeof value !== 'boolean') invalidResponse();
  return value;
}
export function numberValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalidResponse();
  return value;
}
export function listValue<T>(
  value: unknown,
  decode: (item: unknown) => T,
): T[] {
  if (!Array.isArray(value)) invalidResponse();
  return Array.from(value, decode);
}
export function nullableValue<T>(
  value: unknown,
  decode: (item: unknown) => T,
): T | null {
  return value === null ? null : decode(value);
}
