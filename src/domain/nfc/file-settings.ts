/* eslint-disable no-bitwise */
import {NfcFailure} from './failure';
import {hex} from './type4';

export interface FileAccessRights {
  readWrite: number;
  change: number;
  read: number;
  write: number;
}
export interface SdmFileSettings {
  options: number;
  uidMirrored: boolean;
  counterMirrored: boolean;
  accessRights: {counterRetrieval: number; metaRead: number; fileRead: number};
  uidOffset?: number;
  counterOffset?: number;
  piccDataOffset?: number;
  macInputOffset?: number;
  encryptedDataOffset?: number;
  encryptedDataLength?: number;
  macOffset?: number;
  counterLimit?: number;
}
export interface NdefFileSettings {
  fileNumber: 2;
  rawHex: string;
  communication: 'PLAIN' | 'MAC' | 'FULL';
  accessRights: FileAccessRights;
  fileSize: number;
  sdm?: SdmFileSettings;
}
function invalid(): never {
  throw new NfcFailure(
    'NFC_INVALID_RESPONSE',
    'Permissões do arquivo NDEF inválidas ou incompletas.',
  );
}
const keyRight = (value: number) => value <= 4 || value === 14 || value === 15;

/** NXP datasheet tables 69/73. Input excludes SW1/SW2; not a protection proof. */
export function ndefFileSettings(bytes: readonly number[]): NdefFileSettings {
  if (
    bytes.length < 7 ||
    bytes.length > 64 ||
    bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    invalid();
  let position = 0;
  const take = (size: number) => {
    if (position + size > bytes.length) invalid();
    const result = bytes.slice(position, position + size);
    position += size;
    return result;
  };
  const byte = () => take(1)[0];
  const uint24 = () =>
    take(3).reduceRight((value, part) => value * 256 + part, 0);
  if (byte() !== 0) invalid();
  const option = byte();
  if ((option & 0xbc) !== 0 || (option & 3) === 2) invalid();
  const first = byte(),
    second = byte();
  const accessRights = {
    readWrite: first >> 4,
    change: first & 15,
    read: second >> 4,
    write: second & 15,
  };
  if (Object.values(accessRights).some(right => !keyRight(right))) invalid();
  const fileSize = uint24();
  if (!fileSize) invalid();
  const result: NdefFileSettings = {
    fileNumber: 2,
    rawHex: hex(bytes),
    communication:
      option % 4 === 0 ? 'PLAIN' : option % 4 === 1 ? 'MAC' : 'FULL',
    accessRights,
    fileSize,
  };
  if (option & 0x40) {
    const options = byte();
    if ((options & 0x0e) !== 0 || !(options & 1)) invalid();
    const low = byte(),
      high = byte();
    const counterRetrieval = low & 15,
      metaRead = high >> 4,
      fileRead = high & 15;
    if (
      low >> 4 !== 15 ||
      !keyRight(counterRetrieval) ||
      !keyRight(metaRead) ||
      !(fileRead <= 4 || fileRead === 15)
    )
      invalid();
    const sdm: SdmFileSettings = {
      options,
      uidMirrored: !!(options & 0x80),
      counterMirrored: !!(options & 0x40),
      accessRights: {counterRetrieval, metaRead, fileRead},
    };
    if (
      (!sdm.counterMirrored &&
        (counterRetrieval !== 15 || !!(options & 0x20))) ||
      (sdm.uidMirrored && metaRead === 15) ||
      (!sdm.uidMirrored && !sdm.counterMirrored && metaRead !== 15) ||
      (options & 0x10 &&
        (fileRead === 15 || !sdm.uidMirrored || !sdm.counterMirrored))
    )
      invalid();
    if (metaRead === 14 && sdm.uidMirrored) sdm.uidOffset = uint24();
    if (metaRead === 14 && sdm.counterMirrored) sdm.counterOffset = uint24();
    if (metaRead <= 4) sdm.piccDataOffset = uint24();
    if (fileRead !== 15) {
      sdm.macInputOffset = uint24();
      if (options & 0x10) {
        sdm.encryptedDataOffset = uint24();
        sdm.encryptedDataLength = uint24();
      }
      sdm.macOffset = uint24();
      if (sdm.macInputOffset > sdm.macOffset) invalid();
    }
    if (options & 0x20) sdm.counterLimit = uint24();
    const ranges: {start: number; size: number}[] = [];
    const mirror = (start: number | undefined, size: number) => {
      if (start === undefined) return;
      if (
        start + size > fileSize ||
        ranges.some(
          range =>
            start < range.start + range.size && range.start < start + size,
        )
      )
        invalid();
      ranges.push({start, size});
    };
    mirror(sdm.uidOffset, 14);
    if (sdm.counterOffset !== 0xffffff) mirror(sdm.counterOffset, 6);
    mirror(sdm.piccDataOffset, 32);
    mirror(sdm.macOffset, 16);
    if (sdm.encryptedDataOffset !== undefined) {
      const size = sdm.encryptedDataLength!;
      if (
        size < 32 ||
        size % 32 ||
        sdm.encryptedDataOffset < sdm.macInputOffset! ||
        sdm.encryptedDataOffset + size > sdm.macOffset!
      )
        invalid();
      mirror(sdm.encryptedDataOffset, size);
    }
    result.sdm = sdm;
  }
  if (position !== bytes.length) invalid();
  return result;
}

export function accessDescription(right: number): string {
  if (right === 14) return 'Livre';
  if (right === 15) return 'Sem acesso por esta permissão';
  return `Exige chave ${right}`;
}

/** Both write routes matter; a restricted Write alone does not protect ReadWrite. */
export function writeAccessSummary(rights: FileAccessRights): string {
  if (rights.write === 14 || rights.readWrite === 14)
    return 'O chip declara uma rota de escrita livre.';
  if (rights.write === 15 && rights.readWrite === 15)
    return 'O chip declara as duas rotas de escrita sem acesso.';
  return 'As rotas de escrita disponíveis exigem chave.';
}
