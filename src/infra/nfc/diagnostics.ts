import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {inspectType4} from '../../appplication/nfc/inspect-type4';
import {
  decodeReference,
  nativeFailure,
  normalizedUid,
  withNativeSession,
} from './reader';
import {NfcFailure} from '../../domain/nfc/failure';
import {wireNdefRecords} from '../../domain/nfc/ndef';

import type {PhysicalTagReport} from '../../appplication/nfc/physical-report';
export {diagnosticJson} from '../../appplication/nfc/physical-report';
export type {PhysicalTagReport} from '../../appplication/nfc/physical-report';

/** Independent of the API and provisionments: no activation, configuration or secrets. */
export function diagnosePhysicalTag(): Promise<PhysicalTagReport> {
  return withNativeSession('type4', async (module, scope) => {
    const tag = await scope.step(() => module.default.getTag());
    const uid = normalizedUid(tag?.id);
    const inspection = await inspectType4({
      transceive: async command => {
        try {
          return await scope.step(() =>
            module.default.isoDepHandler.transceive(command),
          );
        } catch (error) {
          throw nativeFailure(error, module);
        }
      },
    });
    let reference: string | undefined;
    let ndefDecodeIssue: string | undefined;
    if (inspection.ndef.bytes?.length) {
      try {
        reference = decodeReference(
          wireNdefRecords(inspection.ndef.bytes),
          module.Ndef,
        );
      } catch (error) {
        ndefDecodeIssue =
          error instanceof NfcFailure
            ? error.message
            : 'Bytes lidos, mas a mensagem NDEF não pôde ser interpretada.';
      }
    }
    const version = inspection.version.value;
    return {
      ...inspection,
      reportVersion: 2,
      capturedAt: new Date().toISOString(),
      uid,
      technologies: tag?.techTypes ?? (tag?.tech ? [tag.tech] : []),
      device: {
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        appVersion: Constants.expoConfig?.version ?? 'desconhecida',
        nativeBuild:
          (Platform.OS === 'ios'
            ? Constants.platform?.ios?.buildNumber
            : Constants.platform?.android?.versionCode
          )?.toString() ?? 'desconhecido',
        ...(Constants.expoConfig?.extra?.reproducibility
          ? {jsSource: Constants.expoConfig.extra.reproducibility}
          : {}),
      },
      ...(reference ? {reference} : {}),
      ...(ndefDecodeIssue ? {ndefDecodeIssue} : {}),
      uidMatchesProduction: version
        ? !version.uidHidden && uid === version.productionUid
        : null,
    };
  });
}
