import {NfcFailure} from './failure';

/** Read one protocol byte; truncated/sparse input is never coerced to zero. */
export function byteAt(bytes: readonly number[], offset: number): number {
  const value = bytes[offset];
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 255
  )
    throw new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'Resposta NFC inválida ou incompleta.',
    );
  return value;
}
