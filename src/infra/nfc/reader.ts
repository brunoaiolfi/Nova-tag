import Constants, {ExecutionEnvironment} from 'expo-constants';
import {Platform} from 'react-native';
import type {Reading} from '../../appplication/traceability/workflow';
import {ExclusiveNfcSession} from '../../appplication/nfc/exclusive-session';
import type {SessionScope} from '../../appplication/nfc/exclusive-session';
import {NfcFailure} from '../../domain/nfc/failure';
import {readType4Ndef} from '../../appplication/nfc/read-type4-ndef';
import {
  bytesBase64,
  wireNdefRecords,
  utf8,
  ndefText,
} from '../../domain/nfc/ndef';

export const physicalNfcAvailable =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const session = new ExclusiveNfcSession({
  schedule(milliseconds, callback) {
    const timer = setTimeout(callback, milliseconds);
    return () => clearTimeout(timer);
  },
});
type NativeModule = typeof import('react-native-nfc-manager');

async function native() {
  if (!physicalNfcAvailable) {
    throw new NfcFailure(
      'NFC_UNAVAILABLE',
      'Instale o aplicativo de desenvolvimento Nova-tag. O Expo Go não inclui o módulo NFC.',
    );
  }
  // Lazy require keeps Expo Go/web startup safe when the native module is absent.
  return require('react-native-nfc-manager') as typeof import('react-native-nfc-manager');
}

export function decodeReference(
  records:
    | {tnf: number; type: string | number[]; payload: number[]}[]
    | undefined,
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
        if (!record.payload.length || record.payload[0] > 0x23) {
          throw new NfcFailure(
            'NFC_INVALID_RESPONSE',
            'Prefixo URI NDEF inválido. Faça uma nova leitura.',
          );
        }
        return [
          ndef.uri.decodePayload(Uint8Array.from([record.payload[0]])) +
            utf8(record.payload.slice(1)),
        ];
      }
      if (type === ndef.RTD_TEXT) {
        return [ndefText(record.payload)];
      }
      return [];
    });
  const references = values.filter(value =>
    value.startsWith('urn:nfc-trace:provisioning:'),
  );
  if (references.length > 1) {
    throw new NfcFailure(
      'NFC_INVALID_RESPONSE',
      'Etiqueta com múltiplas referências de provisionamento.',
    );
  }
  return references[0] ?? values[0];
}

export function normalizedUid(id: string | undefined): string {
  const uid = id?.replace(/[\s:-]/g, '').toUpperCase();
  if (!uid || !/^(?:[0-9A-F]{2}){4,10}$/.test(uid)) {
    throw new NfcFailure(
      'NFC_INVALID_UID',
      'A etiqueta não retornou um UID compatível.',
    );
  }
  return uid;
}

export function nativeFailure(
  error: unknown,
  module: NativeModule,
): NfcFailure {
  if (error instanceof NfcFailure) {
    return error;
  }
  const errors = module.NfcError;
  const androidTagLost =
    errors &&
    error instanceof errors.NfcErrorBase &&
    /android\.nfc\.TagLostException|\bTAG_LOST\b/.test(error.message);
  if (errors && error instanceof errors.UserCancel) {
    return new NfcFailure(
      'NFC_CANCELLED',
      'Leitura cancelada no aparelho. Toque em Ler etiqueta para tentar novamente.',
    );
  }
  if (errors && error instanceof errors.Timeout) {
    return new NfcFailure(
      'NFC_TIMEOUT',
      'O tempo de leitura terminou. Aproxime a etiqueta e tente novamente. Se estava gravando, confira o conteúdo antes de ativar o vínculo.',
    );
  }
  if (
    androidTagLost ||
    (errors &&
      (error instanceof errors.TagConnectionLost ||
        error instanceof errors.TagNotConnected))
  ) {
    return new NfcFailure(
      'NFC_TAG_LOST',
      'A conexão com a etiqueta foi perdida. Mantenha-a parada até a conferência. Se estava gravando, o vínculo continua pendente.',
    );
  }
  if (errors && error instanceof errors.RadioDisabled) {
    return new NfcFailure('NFC_DISABLED', 'Ative o NFC para continuar.');
  }
  if (errors && error instanceof errors.UnsupportedFeature) {
    return new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Esta etiqueta ou aparelho não suporta a operação solicitada.',
    );
  }
  return new NfcFailure(
    'NFC_FAILURE',
    'Não foi possível concluir a operação NFC. Aproxime a etiqueta e tente novamente. Se estava gravando, confira o conteúdo antes de ativar o vínculo.',
  );
}

export function withNativeSession<T>(
  technology: 'reading' | 'writing' | 'type4',
  action: (
    module: NativeModule,
    scope: SessionScope,
    connectedTechnology: string | null,
  ) => Promise<T>,
): Promise<T> {
  return session.run(async scope => {
    const module = await scope.step(native);
    const manager = module.default;
    scope.onClose(async () => {
      await manager.cancelTechnologyRequest();
    });
    try {
      if (!(await scope.step(() => manager.isSupported()))) {
        throw new NfcFailure(
          'NFC_UNAVAILABLE',
          'NFC indisponível neste aparelho.',
        );
      }
      await scope.step(() => manager.start());
      if (!(await scope.step(() => manager.isEnabled()))) {
        throw new NfcFailure('NFC_DISABLED', 'Ative o NFC para continuar.');
      }
      const connectedTechnology = await scope.step(() =>
        manager.requestTechnology(
          technology === 'type4'
            ? module.NfcTech.IsoDep
            : technology === 'writing'
            ? module.NfcTech.Ndef
            : [
                module.NfcTech.IsoDep,
                module.NfcTech.Ndef,
                module.NfcTech.NfcA,
                ...(Platform.OS === 'ios'
                  ? [module.NfcTech.Iso15693IOS]
                  : [module.NfcTech.NfcV]),
              ],
          {
            alertMessage:
              technology === 'writing'
                ? 'Mantenha a etiqueta próxima para gravar e conferir.'
                : 'Aproxime a etiqueta da parte superior do iPhone.',
          },
        ),
      );
      return await action(module, scope, connectedTechnology);
    } catch (error) {
      throw nativeFailure(error, module);
    }
  });
}

// Sessions start only on an explicit tap and always close, including failures.
export async function readPhysicalTag(write?: {
  uid: string;
  reference: string;
}): Promise<Reading> {
  return withNativeSession(
    write ? 'writing' : 'reading',
    async (module, scope, connectedTechnology) => {
      const manager = module.default;
      const tag = await scope.step(() => manager.getTag());
      const uid = normalizedUid(tag?.id);
      const technologies = tag?.techTypes ?? (tag?.tech ? [tag.tech] : []);
      if (write && write.uid !== uid) {
        throw new NfcFailure(
          'NFC_INVALID_UID',
          'Etiqueta diferente. Nenhum dado foi gravado.',
        );
      }
      const status = await scope.step(() =>
        manager.ndefHandler.getNdefStatus(),
      );
      if (!write && connectedTechnology === module.NfcTech.IsoDep) {
        // An unformatted IsoDep tag remains usable for UID. This explicit SDK
        // status precedes any APDU read; an APDU failure never triggers fallback.
        if (status.status === module.NdefStatus.NotSupported) {
          return {uid, tecnologias: technologies};
        }
        const {bytes} = await readType4Ndef({
          transceive: command =>
            scope.step(() => manager.isoDepHandler.transceive(command)),
        });
        const ndef = decodeReference(wireNdefRecords(bytes), module.Ndef);
        return {
          uid,
          ...(ndef !== undefined ? {ndef} : {}),
          ...(bytes.length ? {bytesBase64: bytesBase64(bytes)} : {}),
          tecnologias: technologies,
        };
      }
      if (write) {
        const bytes = module.Ndef.encodeMessage([
          module.Ndef.uriRecord(write.reference),
        ]);
        if (!bytes) {
          throw new NfcFailure(
            'NFC_INVALID_RESPONSE',
            'Não foi possível codificar a referência NDEF.',
          );
        }
        if (
          status.status !== module.NdefStatus.ReadWrite ||
          bytes.length > status.capacity
        ) {
          // Read-only tags can be retried after an activation response was lost.
          const previous = await scope.step(() =>
            manager.ndefHandler.getNdefMessage(),
          );
          if (
            decodeReference(previous?.ndefMessage, module.Ndef) !==
            write.reference
          ) {
            throw new NfcFailure(
              'NFC_ACCESS_DENIED',
              'Etiqueta sem espaço ou sem permissão de escrita. Vínculo continua pendente.',
            );
          }
        } else {
          await scope.step(() => manager.ndefHandler.writeNdefMessage(bytes));
        }
      }
      const message =
        status.status === module.NdefStatus.NotSupported
          ? undefined
          : await scope.step(() => manager.ndefHandler.getNdefMessage());
      const ndef = decodeReference(message?.ndefMessage, module.Ndef);
      if (write && ndef !== write.reference) {
        throw new NfcFailure(
          'NFC_INVALID_RESPONSE',
          'A releitura não confirmou a gravação. Vínculo continua pendente.',
        );
      }
      return {
        uid,
        ...(ndef !== undefined ? {ndef} : {}),
        tecnologias: technologies,
      };
    },
  );
}

export async function cancelPhysicalRead() {
  await session.cancel();
}
