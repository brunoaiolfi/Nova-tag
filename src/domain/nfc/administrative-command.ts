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
  const instruction = apduBytes[1],
    length = apduBytes[4];
  if (
    apduBytes[0] !== 0x90 ||
    apduBytes[2] !== 0 ||
    apduBytes[3] !== 0 ||
    apduBytes.at(-1) !== 0 ||
    length !== apduBytes.length - 6
  )
    invalid();
  const mutates = [0x8d, 0x5f, 0xc4].includes(instruction);
  if (command.alteraTag !== mutates) invalid();
  switch (instruction) {
    case 0x71:
      if (length !== 2 || apduBytes[5] > 4 || apduBytes[6] !== 0) invalid();
      break;
    case 0x77:
      if (length !== 1 || apduBytes[5] > 4) invalid();
      break;
    case 0xaf:
      if (length !== 32) invalid();
      break;
    case 0x51:
      if (length !== 8) invalid();
      break;
    case 0xf5:
      if (length !== 9 || ![1, 2].includes(apduBytes[5])) invalid();
      break;
    case 0x64:
      if (length !== 9 || apduBytes[5] > 4) invalid();
      break;
    case 0xad:
    case 0x8d:
      assertFileRange(apduBytes, instruction, length);
      break;
    case 0x5f:
      if (![25, 41].includes(length) || ![1, 2].includes(apduBytes[5]))
        invalid();
      break;
    case 0xc4:
      if (length !== 41 || apduBytes[5] > 4) invalid();
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
  const file = bytes[5];
  const offset = bytes[6] + bytes[7] * 256 + bytes[8] * 65536;
  const count = bytes[9] + bytes[10] * 256 + bytes[11] * 65536;
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
  commandBytes(value);
  return value as AdminCommand;
}
