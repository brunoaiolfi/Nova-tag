import {NfcFailure} from '../../domain/nfc/failure';
import {
  capabilityContainer,
  NdefFile,
  response,
  word,
} from '../../domain/nfc/type4';

export interface ReadOnlyApduPort {
  transceive(command: number[]): Promise<number[]>;
}
export const SELECT_NDEF = [
  0x00, 0xa4, 0x04, 0x0c, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00,
];
export const MAXIMUM_NDEF_BYTES = 4096;

export function apduPayload(
  bytes: readonly number[],
  expectedStatus = '9000',
): number[] {
  const parsed = response(bytes);
  if (parsed.status !== expectedStatus) {
    throw new NfcFailure(
      ['6982', '6985', '919D', '91AE'].includes(parsed.status)
        ? 'NFC_ACCESS_DENIED'
        : 'NFC_UNSUPPORTED_TAG',
      `A etiqueta recusou o comando de consulta (status ${parsed.status}).`,
    );
  }
  return parsed.data;
}

/** Reads the message on the wire, without GET_VERSION, writes or SDK recoding.
 * After selecting the NDEF file, NLEN and payload use consecutive READ_BINARYs.
 * Do not interleave commands: SDM may refresh the evidence after another command.
 */
export async function readType4Ndef(
  port: ReadOnlyApduPort,
  onCapability?: (file: NdefFile) => void,
): Promise<{file: NdefFile; bytes: number[]}> {
  const exchange = async (command: number[]) =>
    apduPayload(await port.transceive(command));
  async function read(offset: number, length: number, chunkSize: number) {
    const bytes: number[] = [];
    while (bytes.length < length) {
      const count = Math.min(length - bytes.length, chunkSize, 255);
      const position = offset + bytes.length;
      const part = await exchange([
        0x00,
        0xb0,
        Math.floor(position / 256),
        position % 256,
        count,
      ]);
      if (part.length !== count) {
        throw new NfcFailure(
          'NFC_INVALID_RESPONSE',
          'A etiqueta retornou menos bytes que o tamanho solicitado.',
        );
      }
      bytes.push(...part);
    }
    return bytes;
  }
  const selectFile = (id: number) =>
    exchange([
      0x00,
      0xa4,
      0x00,
      0x0c,
      0x02,
      Math.floor(id / 256),
      id % 256,
      0x00,
    ]);
  await exchange([...SELECT_NDEF]);
  await selectFile(0xe103);
  const header = await read(0, 7, 7);
  const size = word(header, 0);
  const maximumReadSize = word(header, 3);
  if (size < 15 || size > MAXIMUM_NDEF_BYTES || maximumReadSize < 7) {
    throw new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'Capacidade NDEF fora dos limites do leitor.',
    );
  }
  const file = capabilityContainer([
    ...header,
    ...(await read(7, size - 7, maximumReadSize)),
  ]);
  onCapability?.(file);
  if (file.readAccess !== 0) {
    throw new NfcFailure(
      'NFC_ACCESS_DENIED',
      'A etiqueta não declara leitura NDEF pública. Não foi tentada autenticação.',
    );
  }
  await selectFile(file.fileId);
  const length = word(await read(0, 2, file.maximumReadSize), 0);
  if (length > file.maximumFileSize - 2 || length > MAXIMUM_NDEF_BYTES) {
    throw new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'O tamanho declarado do NDEF excede a capacidade ou o limite do leitor.',
    );
  }
  return {file, bytes: await read(2, length, file.maximumReadSize)};
}
