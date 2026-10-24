import {byteAt} from './byte';
import type {AdminCommand} from './administrative-command.types';
import {record, integer, matches} from '../validation/values';
import {uuid} from '../administration/contract-values';
import {invalid} from '../administration/invalid-contract';

/** Transport allowlist; cryptographic verification stays in the server. Reject unknown/irreversible instructions. */
export function commandBytes(command: unknown): number[] {
  if (
    !record(command) ||
    !uuid(command.id) ||
    !integer(command.sequencia, 1) ||
    typeof command.etapa !== 'string' ||
    !matches(command.apduHex, /^(?:[0-9A-F]{2}){6,128}$/)
  )
    invalid();
  const apduBytes = command.apduHex
    .match(/../g)!
    .map(hexByte => parseInt(hexByte, 16));
  const instruction = byteAt(apduBytes, 1),
    length = byteAt(apduBytes, 4);
  if (
    byteAt(apduBytes, 0) !== 0x90 ||
    byteAt(apduBytes, 2) !== 0 ||
    byteAt(apduBytes, 3) !== 0 ||
    apduBytes.at(-1) !== 0 ||
    length !== apduBytes.length - 6
  )
    invalid();
  const mutates = [0x8d, 0x5f, 0xc4].includes(instruction);
  if (command.alteraTag !== mutates) invalid();
  switch (instruction) {
    case 0x71:
      if (
        length !== 2 ||
        byteAt(apduBytes, 5) > 4 ||
        byteAt(apduBytes, 6) !== 0
      )
        invalid();
      break;
    case 0x77:
      if (length !== 1 || byteAt(apduBytes, 5) > 4) invalid();
      break;
    case 0xaf:
      if (length !== 32) invalid();
      break;
    case 0x51:
      if (length !== 8) invalid();
      break;
    case 0xf5:
      if (length !== 9 || ![1, 2].includes(byteAt(apduBytes, 5))) invalid();
      break;
    case 0x64:
      if (length !== 9 || byteAt(apduBytes, 5) > 4) invalid();
      break;
    case 0xad:
    case 0x8d:
      assertFileRange(apduBytes, instruction, length);
      break;
    case 0x5f:
      if (![25, 41].includes(length) || ![1, 2].includes(byteAt(apduBytes, 5)))
        invalid();
      break;
    case 0xc4:
      if (length !== 41 || byteAt(apduBytes, 5) > 4) invalid();
      break;
    default:
      invalid();
  }
  return apduBytes;
}

function assertFileRange(
  bytes: readonly number[],
  instruction: number,
  length: number,
): void {
  const file = byteAt(bytes, 5);
  const offset =
    byteAt(bytes, 6) + byteAt(bytes, 7) * 256 + byteAt(bytes, 8) * 65536;
  const count =
    byteAt(bytes, 9) + byteAt(bytes, 10) * 256 + byteAt(bytes, 11) * 65536;
  if (
    ![1, 2].includes(file) ||
    count < 1 ||
    count > 80 ||
    offset + count > (file === 1 ? 32 : 256)
  )
    invalid();
  const expectedLength =
    instruction === 0xad ? 15 : 7 + (Math.floor(count / 16) + 1) * 16 + 8;
  if (length !== expectedLength) invalid();
}
export function decodeCommand(value: unknown): AdminCommand {
  if (
    !record(value) ||
    !uuid(value.id) ||
    !integer(value.sequencia, 1) ||
    typeof value.etapa !== 'string' ||
    typeof value.apduHex !== 'string' ||
    typeof value.alteraTag !== 'boolean'
  )
    invalid();
  commandBytes(value);
  return {
    id: value.id,
    sequencia: value.sequencia,
    etapa: value.etapa,
    apduHex: value.apduHex,
    alteraTag: value.alteraTag,
  };
}
