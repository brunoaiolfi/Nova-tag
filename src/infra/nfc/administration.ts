import * as Crypto from 'expo-crypto';
import type {AdminOperation} from '../../domain/administration/operation';
import type {
  AdministrativeNfc,
  AdministrativeRf,
} from '../../appplication/administration/coordinator';
import {NfcFailure} from '../../domain/nfc/failure';
import {tagVersion} from '../../domain/nfc/type4';
import {apduPayload, SELECT_NDEF} from '../../appplication/nfc/read-type4-ndef';
import {
  cancelPhysicalRead,
  nativeFailure,
  normalizedUid,
  withNativeSession,
  readPhysicalTag,
} from './reader';

async function identify(
  port: {transceive(bytes: number[]): Promise<number[]>},
  uid: string,
) {
  const exchange = async (apduBytes: number[], sw: string) =>
    apduPayload(await port.transceive(apduBytes), sw);
  await exchange([...SELECT_NDEF], '9000');
  const hardware = await exchange([0x90, 0x60, 0, 0, 0], '91AF');
  if (hardware.length !== 7)
    throw new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Modelo da etiqueta não confirmado.',
    );
  const software = await exchange([0x90, 0xaf, 0, 0, 0], '91AF');
  if (software.length !== 7)
    throw new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Modelo da etiqueta não confirmado.',
    );
  const production = await exchange([0x90, 0xaf, 0, 0, 0], '9100'),
    version = tagVersion([hardware, software, production]);
  if (
    !version.compatibleNtag424 ||
    version.uidHidden ||
    version.productionUid !== uid
  )
    throw new NfcFailure(
      'NFC_UNSUPPORTED_TAG',
      'Esta configuração exige NTAG 424 DNA com UID público estável. A Feiju não utiliza o protocolo administrativo.',
    );
  return {uid, version};
}
export async function identifyAdministrativeTag() {
  return withNativeSession('type4', async (module, scope) => {
    const tag = await scope.step(() => module.default.getTag()),
      uid = normalizedUid(tag?.id);
    return identify(
      {
        transceive: apduBytes =>
          scope.step(() => module.default.isoDepHandler.transceive(apduBytes)),
      },
      uid,
    );
  });
}
export class NativeAdministrativeNfc implements AdministrativeNfc {
  async run<T>(
    operation: AdminOperation,
    work: (rf: AdministrativeRf) => Promise<T>,
  ): Promise<T> {
    let pending: Promise<T> | undefined;
    let jobError: unknown;
    try {
      return await withNativeSession(
        'type4',
        async (module, scope) => {
          const tag = await scope.step(() => module.default.getTag()),
            uid = normalizedUid(tag?.id);
          if (uid !== operation.plano.uid)
            throw new NfcFailure(
              'NFC_INVALID_UID',
              'Etiqueta diferente do plano. Nenhuma alteração administrativa foi transmitida.',
            );
          await identify(
            {
              transceive: apduBytes =>
                scope.step(() =>
                  module.default.isoDepHandler.transceive(apduBytes),
                ),
            },
            uid,
          );
          // Do not read public NDEF here: diagnostics can advance an already-enabled SDM counter.
          pending = work({
            id: Crypto.randomUUID(),
            checkpoint: scope.checkpoint,
            transceive: async bytes => {
              scope.checkpoint();
              try {
                return await module.default.isoDepHandler.transceive(bytes);
              } catch (error) {
                throw nativeFailure(error, module);
              }
            },
          }).catch(error => {
            jobError = error;
            throw error;
          });
          return pending;
        },
        {
          timeoutMilliseconds: 180000,
          alertMessage:
            'Configurando a etiqueta. Mantenha-a imóvel junto à antena até terminar.',
        },
      );
    } catch (error) {
      // Once the job starts, retain ownership until a late NFC response is durably saved.
      if (pending) await pending.catch(() => {});
      throw jobError ?? error;
    }
  }
  cancel(): Promise<void> {
    return cancelPhysicalRead();
  }
  async read(operation: AdminOperation) {
    const reading = await readPhysicalTag();
    if (reading.uid !== operation.plano.uid)
      throw new NfcFailure(
        'NFC_INVALID_UID',
        'Etiqueta diferente da personalização. Nenhum vínculo foi ativado.',
      );
    return reading;
  }
}
