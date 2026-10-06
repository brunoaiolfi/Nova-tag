import {NdefFileSettings, ndefFileSettings} from './file-settings';
import {hex} from './type4';

export const SDM_BENCH_PROFILE = 'nfc-trace.sdm.encrypted-picc.v1';
export interface SdmBenchPlan {
  profile: typeof SDM_BENCH_PROFILE;
  status: 'CANDIDATO_BANCADA';
  provisioningId: string;
  fileNumber: 2;
  isoFileId: 'E104';
  fileCapacity: 256;
  uriTemplate: string;
  messageBytes: number[];
  fileBytes: number[];
  offsets: {
    piccData: number;
    macInput: number;
    mac: number;
    piccLength: 32;
    macLength: 16;
  };
  expectedSettings: NdefFileSettings;
  keySlots: {administration: 0; metaRead: 1; fileRead: 2};
}
const littleEndian = (value: number) => [
  value % 256,
  Math.floor(value / 256) % 256,
  Math.floor(value / 65536),
];

/** Offline candidate only: no keys, epoch allocation, APDU mutation or activation. */
export function createSdmBenchPlan(id: string): SdmBenchPlan {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new Error('Informe um UUID de provisionamento válido.');
  }
  const provisioningId = id.toLowerCase();
  const uriTemplate = `urn:nfc-trace:sdm:v1:${provisioningId}?picc_data=${'0'.repeat(
    32,
  )}&cmac=${'0'.repeat(16)}`;
  const uri = Array.from(uriTemplate, character => character.charCodeAt(0));
  // Exactly one short URI record, no compression. Offsets include two NLEN bytes.
  const messageBytes = [0xd1, 1, uri.length + 1, 0x55, 0, ...uri];
  const fileBytes = [
    Math.floor(messageBytes.length / 256),
    messageBytes.length % 256,
    ...messageBytes,
  ];
  if (uri.length + 1 > 255 || fileBytes.length > 256)
    throw new Error('Perfil excede a capacidade NDEF.');
  const offsets = {
    piccData: 7 + uriTemplate.indexOf('?picc_data=') + '?picc_data='.length,
    macInput: 7,
    mac: 7 + uriTemplate.indexOf('&cmac=') + '&cmac='.length,
    piccLength: 32 as const,
    macLength: 16 as const,
  };
  // GetFileSettings-shaped reference, not a ChangeFileSettings command payload.
  // RW=F, Change=0, Read=E, Write=0; SDM counter retrieval=F, metadata=1, MAC=2.
  const settingsBytes = [
    0,
    0x43,
    0xf0,
    0xe0,
    0,
    1,
    0,
    0xc1,
    0xff,
    0x12,
    ...littleEndian(offsets.piccData),
    ...littleEndian(offsets.macInput),
    ...littleEndian(offsets.mac),
  ];
  return {
    profile: SDM_BENCH_PROFILE,
    status: 'CANDIDATO_BANCADA',
    provisioningId,
    fileNumber: 2,
    isoFileId: 'E104',
    fileCapacity: 256,
    uriTemplate,
    messageBytes,
    fileBytes,
    offsets,
    expectedSettings: ndefFileSettings(settingsBytes),
    keySlots: {administration: 0, metaRead: 1, fileRead: 2},
  };
}

export interface SdmLayoutComparison {
  profile: typeof SDM_BENCH_PROFILE;
  layoutMatches: boolean;
  authenticated: false;
  physicallyAccepted: false;
  differences: string[];
}

/** Structural bench comparison only; dynamic hex is not decrypted or authenticated. */
export function compareSdmLayout(
  plan: SdmBenchPlan,
  settings: NdefFileSettings,
  message: readonly number[],
): SdmLayoutComparison {
  // Derive a fresh versioned plan; callers cannot silently change offsets or masks.
  const expected = createSdmBenchPlan(plan.provisioningId);
  if (JSON.stringify(plan) !== JSON.stringify(expected))
    throw new Error('Plano SDM alterado ou incompatível com a versão.');
  const differences: string[] = [];
  if (settings.rawHex !== expected.expectedSettings.rawHex)
    differences.push('PERMISSOES_OU_OFFSETS_DIVERGENTES');
  if (
    message.length !== expected.messageBytes.length ||
    message.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)
  ) {
    differences.push('MENSAGEM_INVALIDA_OU_TAMANHO_DIVERGENTE');
  } else {
    const observed = [...message];
    for (const [offset, length] of [
      [expected.offsets.piccData, 32],
      [expected.offsets.mac, 16],
    ]) {
      const start = offset - 2;
      const chars = observed
        .slice(start, start + length)
        .map(byte => String.fromCharCode(byte))
        .join('');
      if (!/^[0-9a-f]+$/i.test(chars))
        differences.push('CAMPO_DINAMICO_FORA_DO_FORMATO_HEX');
      observed.fill(0x30, start, start + length);
    }
    if (hex(observed) !== hex(expected.messageBytes))
      differences.push('CONTEUDO_ESTATICO_DIVERGENTE');
  }
  return {
    profile: SDM_BENCH_PROFILE,
    layoutMatches: differences.length === 0,
    authenticated: false,
    physicallyAccepted: false,
    differences: [...new Set(differences)],
  };
}
