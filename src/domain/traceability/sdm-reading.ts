import {bytesBase64} from '../nfc/ndef';
import {createSdmBenchPlan, SDM_BENCH_PROFILE} from '../nfc/sdm-profile';
import type {Provisioning, Reading} from './types';

export function sdmProvisioningId(uri: string): string {
  const match =
    /^urn:nfc-trace:sdm:v1:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\?picc_data=[0-9a-fA-F]{32}&cmac=[0-9a-fA-F]{16}$/.exec(
      uri,
    );
  if (!match)
    throw new Error(
      'Referência SDM inválida. Faça uma nova leitura; a estratégia será determinada pelo servidor.',
    );
  return match[1];
}
/** Structural check only. Authentication, counter consumption and logistics belong to the API. */
export function assertSdmReading(p: Provisioning, reading: Reading): void {
  if (p.estrategia !== 'SDM') {
    if (reading.ndef?.startsWith('urn:nfc-trace:sdm:'))
      throw new Error(
        'A referência SDM não corresponde à estratégia deste vínculo.',
      );
    return;
  }
  if (
    !reading.ndef ||
    sdmProvisioningId(reading.ndef) !== p.id ||
    !p.sdm ||
    p.sdm.perfil !== SDM_BENCH_PROFILE ||
    !p.epoca ||
    p.epoca < 1
  )
    throw new Error(
      'Perfil ou época SDM incompatível. Consulte o vínculo atualizado.',
    );
  const plan = createSdmBenchPlan(p.id);
  const bytes = [
    ...plan.messageBytes.slice(0, 5),
    ...Array.from(reading.ndef, c => c.charCodeAt(0)),
  ];
  if (reading.bytesBase64 !== bytesBase64(bytes))
    throw new Error(
      'A captura SDM precisa dos bytes NDEF originais completos. Faça uma nova leitura.',
    );
}
