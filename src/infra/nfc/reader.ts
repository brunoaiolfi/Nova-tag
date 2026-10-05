import Constants, {ExecutionEnvironment} from 'expo-constants';
import {Platform} from 'react-native';
import type {NdefRecord} from 'react-native-nfc-manager';
import type {Reading} from '../../appplication/traceability/workflow';

export const physicalNfcAvailable =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let busy = false;

async function native() {
  if (!physicalNfcAvailable) {
    throw new Error(
      'Instale o aplicativo de desenvolvimento Nova-tag. O Expo Go não inclui o módulo NFC.',
    );
  }
  // Lazy require keeps Expo Go/web startup safe when the native module is absent.
  return require('react-native-nfc-manager') as typeof import('react-native-nfc-manager');
}

export function decodeReference(
  records: NdefRecord[] | undefined,
  ndef: typeof import('react-native-nfc-manager').Ndef,
): string | undefined {
  const values = (records ?? [])
    .filter(record => record.tnf === ndef.TNF_WELL_KNOWN)
    .flatMap(record => {
      const type =
        typeof record.type === 'string'
          ? record.type
          : String.fromCharCode(...record.type);
      if (type === ndef.RTD_URI) {
        return [ndef.uri.decodePayload(Uint8Array.from(record.payload))];
      }
      if (type === ndef.RTD_TEXT) {
        return [ndef.text.decodePayload(Uint8Array.from(record.payload))];
      }
      return [];
    });
  const references = values.filter(value =>
    value.startsWith('urn:nfc-trace:provisioning:'),
  );
  if (references.length > 1) {
    throw new Error('Etiqueta com múltiplas referências de provisionamento.');
  }
  return references[0] ?? values[0];
}

// Sessions start only on an explicit tap and always close, including failures.
export async function readPhysicalTag(write?: {
  uid: string;
  reference: string;
}): Promise<Reading> {
  if (busy) {
    throw new Error('Uma leitura NFC já está em andamento.');
  }
  busy = true;
  let manager: typeof import('react-native-nfc-manager').default | undefined;
  try {
    const module = await native();
    manager = module.default;
    if (!(await manager.isSupported())) {
      throw new Error('NFC indisponível neste aparelho.');
    }
    await manager.start();
    if (!(await manager.isEnabled())) {
      throw new Error('Ative o NFC para continuar.');
    }
    await manager.requestTechnology(
      write
        ? module.NfcTech.Ndef
        : [
            module.NfcTech.Ndef,
            module.NfcTech.IsoDep,
            module.NfcTech.NfcA,
            ...(Platform.OS === 'ios'
              ? [module.NfcTech.Iso15693IOS]
              : [module.NfcTech.NfcV]),
          ],
      {
        alertMessage: write
          ? 'Mantenha a etiqueta próxima para gravar e conferir.'
          : 'Aproxime a etiqueta da parte superior do iPhone.',
      },
    );
    const tag = await manager.getTag();
    const uid = tag?.id?.replace(/[\s:-]/g, '').toUpperCase();
    if (!uid || !/^(?:[0-9A-F]{2}){4,10}$/.test(uid)) {
      throw new Error('A etiqueta não retornou um UID compatível.');
    }
    if (write && write.uid !== uid) {
      throw new Error('Etiqueta diferente. Nenhum dado foi gravado.');
    }
    const status = await manager.ndefHandler.getNdefStatus();
    if (write) {
      const bytes = module.Ndef.encodeMessage([
        module.Ndef.uriRecord(write.reference),
      ]);
      if (!bytes) {
        throw new Error('Não foi possível codificar a referência NDEF.');
      }
      if (
        status.status !== module.NdefStatus.ReadWrite ||
        bytes.length > status.capacity
      ) {
        // Read-only tags can be retried after an activation response was lost.
        const previous = await manager.ndefHandler.getNdefMessage();
        if (
          decodeReference(previous?.ndefMessage, module.Ndef) !==
          write.reference
        ) {
          throw new Error(
            'Etiqueta sem espaço ou sem permissão de escrita. Vínculo continua pendente.',
          );
        }
      } else {
        await manager.ndefHandler.writeNdefMessage(bytes);
      }
    }
    const message =
      status.status === module.NdefStatus.NotSupported
        ? undefined
        : await manager.ndefHandler.getNdefMessage();
    const ndef = decodeReference(message?.ndefMessage, module.Ndef);
    if (write && ndef !== write.reference) {
      throw new Error(
        'A releitura não confirmou a gravação. Vínculo continua pendente.',
      );
    }
    return {
      uid,
      ...(ndef !== undefined ? {ndef} : {}),
      tecnologias: tag?.techTypes ?? (tag?.tech ? [tag.tech] : []),
    };
  } finally {
    if (manager) {
      await manager.cancelTechnologyRequest().catch(() => {});
    }
    busy = false;
  }
}

export async function cancelPhysicalRead() {
  if (!physicalNfcAvailable || !busy) {
    return;
  }
  const module = await native();
  await module.default.cancelTechnologyRequest().catch(() => {});
}
