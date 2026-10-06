import {NfcFailure} from '../../domain/nfc/failure';
import {hex, NdefFile, tagVersion, TagVersion} from '../../domain/nfc/type4';
import {
  ndefFileSettings,
  NdefFileSettings,
} from '../../domain/nfc/file-settings';

import {
  apduPayload,
  ReadOnlyApduPort,
  readType4Ndef,
  SELECT_NDEF,
} from './read-type4-ndef';
export type {ReadOnlyApduPort} from './read-type4-ndef';

export interface ApduExchange {
  commandHex: string;
  responseHex: string;
}
export interface Type4Inspection {
  exchanges: ApduExchange[];
  version: {value?: TagVersion; issue?: string; code?: string};
  ndef: {file?: NdefFile; bytes?: number[]; issue?: string; code?: string};
  fileSettings: {value?: NdefFileSettings; issue?: string; code?: string};
}

/** Read-only diagnosis; GET_FILE_SETTINGS only for a declared compatible NTAG 424. */
export async function inspectType4(
  port: ReadOnlyApduPort,
): Promise<Type4Inspection> {
  const result: Type4Inspection = {
    exchanges: [],
    version: {},
    ndef: {},
    fileSettings: {},
  };
  async function exchange(command: number[], expectedStatus = '9000') {
    const bytes = await port.transceive(command);
    result.exchanges.push({commandHex: hex(command), responseHex: hex(bytes)});
    return apduPayload(bytes, expectedStatus);
  }
  function issue(error: unknown): {issue: string; code: string} {
    // Cancellation, timeout and physical loss must abort the inspection, not become a model result.
    if (
      !(error instanceof NfcFailure) ||
      ![
        'NFC_ACCESS_DENIED',
        'NFC_UNSUPPORTED_TAG',
        'NFC_INVALID_RESPONSE',
      ].includes(error.code)
    ) {
      throw error;
    }
    return {issue: error.message, code: error.code};
  }
  try {
    await exchange(SELECT_NDEF);
  } catch (error) {
    result.version = issue(error);
    result.ndef = issue(error);
    result.fileSettings = issue(error);
    return result;
  }
  try {
    const hardware = await exchange([0x90, 0x60, 0x00, 0x00, 0x00], '91AF');
    // Do not issue another frame for malformed replies.
    if (hardware.length !== 7) {
      throw new NfcFailure(
        'NFC_INVALID_RESPONSE',
        'Quadro de hardware GET_VERSION inválido.',
      );
    }
    const software = await exchange([0x90, 0xaf, 0x00, 0x00, 0x00], '91AF');
    if (software.length !== 7) {
      throw new NfcFailure(
        'NFC_INVALID_RESPONSE',
        'Quadro de software GET_VERSION inválido.',
      );
    }
    const production = await exchange([0x90, 0xaf, 0x00, 0x00, 0x00], '9100');
    result.version = {value: tagVersion([hardware, software, production])};
  } catch (error) {
    result.version = issue(error);
  }

  if (result.version.value?.compatibleNtag424) {
    try {
      result.fileSettings.value = ndefFileSettings(
        await exchange([0x90, 0xf5, 0, 0, 1, 2, 0], '9100'),
      );
    } catch (error) {
      result.fileSettings = issue(error);
    }
  } else {
    result.fileSettings = {
      issue:
        'Modelo NTAG 424 DNA não confirmado; permissões nativas não consultadas.',
      code: 'NFC_UNSUPPORTED_TAG',
    };
  }

  try {
    const ndef = await readType4Ndef(
      {
        transceive: async command => {
          const bytes = await port.transceive(command);
          result.exchanges.push({
            commandHex: hex(command),
            responseHex: hex(bytes),
          });
          return bytes;
        },
      },
      file => {
        result.ndef.file = file;
      },
    );
    result.ndef = ndef;
  } catch (error) {
    result.ndef = {...result.ndef, ...issue(error)};
  }
  return result;
}
