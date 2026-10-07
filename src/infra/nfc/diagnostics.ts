import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {
  inspectType4,
  Type4Inspection,
} from '../../appplication/nfc/inspect-type4';
import {
  decodeReference,
  nativeFailure,
  normalizedUid,
  withNativeSession,
} from './reader';
import {NfcFailure} from '../../domain/nfc/failure';
import {hex} from '../../domain/nfc/type4';
import {wireNdefRecords} from '../../domain/nfc/ndef';

export interface PhysicalTagReport extends Type4Inspection {
  reportVersion: 2;
  capturedAt: string;
  uid: string;
  technologies: string[];
  device: {
    platform: string;
    osVersion: string;
    appVersion: string;
    nativeBuild: string;
    jsSource?: {
      revision: string | null;
      sourceSha256: string;
      lockSha256: string;
      trackedChanges: boolean | null;
    };
  };
  reference?: string;
  ndefDecodeIssue?: string;
  uidMatchesProduction: boolean | null;
}

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

export function diagnosticJson(report: PhysicalTagReport): string {
  const {bytes, ...ndef} = report.ndef;
  return JSON.stringify(
    {
      ...report,
      ndef: {
        ...ndef,
        ...(bytes ? {messageHex: hex(bytes), messageLength: bytes.length} : {}),
      },
      notice:
        'Diagnóstico de leitura. GET_VERSION e GetFileSettings são declarações do chip, sem prova de autenticidade ou proteção efetiva. A leitura pode avançar o contador de uma etiqueta com SDM. Nenhum vínculo foi ativado.',
    },
    null,
    2,
  );
}
