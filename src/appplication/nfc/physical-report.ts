import type {Type4Inspection} from './inspect-type4';
import {hex} from '../../domain/nfc/type4';

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
