import {NfcFailure} from './failure';

export function hex(bytes: readonly number[]): string {
  return bytes
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function response(bytes: readonly number[]): {
  data: number[];
  status: string;
} {
  if (
    bytes.length < 2 ||
    bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)
  ) {
    throw new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'Resposta APDU inválida ou incompleta.',
    );
  }
  return {data: bytes.slice(0, -2), status: hex(bytes.slice(-2))};
}

export interface TagVersion {
  compatibleNtag424: boolean;
  hardwareHex: string;
  softwareHex: string;
  productionHex: string;
  productionUid: string;
  uidHidden: boolean;
}

/** GET_VERSION is a model declaration, not cryptographic proof of originality. */
export function tagVersion(frames: readonly number[][]): TagVersion {
  if (frames.length !== 3) {
    throw invalidVersion();
  }
  const [hardware, software, production] = frames;
  if (
    hardware.length !== 7 ||
    software.length !== 7 ||
    ![14, 15].includes(production.length)
  ) {
    throw invalidVersion();
  }
  const productionUid = hex(production.slice(0, 7));
  return {
    compatibleNtag424:
      hardware[0] === 0x04 &&
      hardware[1] === 0x04 &&
      hardware[3] === 0x30 &&
      hardware[4] === 0x00 &&
      hardware[5] === 0x11 &&
      hardware[6] === 0x05 &&
      software[0] === 0x04 &&
      software[1] === 0x04 &&
      software[2] === 0x02 &&
      software[3] === 0x01 &&
      [0x01, 0x02].includes(software[4]) &&
      software[5] === 0x11 &&
      software[6] === 0x05,
    hardwareHex: hex(hardware),
    softwareHex: hex(software),
    productionHex: hex(production),
    productionUid,
    uidHidden: productionUid === '00000000000000',
  };
}

function invalidVersion() {
  return new NfcFailure(
    'NFC_INVALID_RESPONSE',
    'GET_VERSION retornou quadros incompletos. O modelo não foi confirmado.',
  );
}

export interface NdefFile {
  fileId: number;
  maximumFileSize: number;
  maximumReadSize: number;
  readAccess: number;
  writeAccess: number;
}

export function capabilityContainer(bytes: readonly number[]): NdefFile {
  const invalid = () =>
    new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'Arquivo de capacidade NDEF inválido ou incompleto.',
    );
  if (bytes.length < 15 || word(bytes, 0) !== bytes.length) {
    throw invalid();
  }
  if (Math.floor(bytes[2] / 16) !== 2) {
    throw new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Este diagnóstico suporta o mapeamento NDEF Type 4 versão 2.',
    );
  }
  const maximumReadSize = word(bytes, 3);
  if (maximumReadSize < 7 || word(bytes, 5) === 0) {
    throw invalid();
  }
  let file: NdefFile | undefined;
  for (let offset = 7; offset < bytes.length; ) {
    const type = bytes[offset++];
    if (type === 0x00) {
      continue;
    }
    if (type === 0xfe) {
      break;
    }
    if (offset >= bytes.length) {
      throw invalid();
    }
    const length = bytes[offset++];
    if (length === 0xff || offset + length > bytes.length) {
      throw invalid();
    }
    if (type === 0x04) {
      if (length !== 6 || file) {
        throw invalid();
      }
      file = {
        fileId: word(bytes, offset),
        maximumFileSize: word(bytes, offset + 2),
        maximumReadSize,
        readAccess: bytes[offset + 4],
        writeAccess: bytes[offset + 5],
      };
      if (
        file.maximumFileSize < 2 ||
        file.fileId === 0 ||
        [0xe102, 0xe103, 0xffff].includes(file.fileId)
      ) {
        throw invalid();
      }
    }
    offset += length;
  }
  if (!file) {
    throw new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Não foi encontrado um arquivo NDEF Type 4 de tamanho compatível.',
    );
  }
  return file;
}

export function word(bytes: readonly number[], offset: number): number {
  return bytes[offset] * 256 + bytes[offset + 1];
}
