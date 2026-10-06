import {
  ndefFileSettings,
  writeAccessSummary,
} from '../src/domain/nfc/file-settings';
import {
  createSdmBenchPlan,
  compareSdmLayout,
} from '../src/domain/nfc/sdm-profile';
import {utf8, wireNdefRecords} from '../src/domain/nfc/ndef';
import example from '../docs/nfc/sdm-profile-v1.example.json';

const id = '11111111-2222-4333-8444-555555555555';
const bytes = (value: string) =>
  value.match(/../g)!.map(part => parseInt(part, 16));
// All settings/messages below are synthetic protocol fixtures, not physical SDM.
const base = '0000F0E0000100';
const encrypted = '0040F0E0000100C1FF12200000000000460000';
const plain = '0040F0E0000100C1FFE2100000200000000000300000';

test('configured file rights and communication are decoded without claiming protection', () => {
  expect(ndefFileSettings(bytes(base))).toMatchObject({
    fileNumber: 2,
    fileSize: 256,
    communication: 'PLAIN',
    accessRights: {readWrite: 15, change: 0, read: 14, write: 0},
  });
  expect(ndefFileSettings(bytes(base)).sdm).toBeUndefined();
  expect(
    writeAccessSummary({readWrite: 14, write: 0, read: 14, change: 0}),
  ).toContain('escrita livre');
  expect(
    writeAccessSummary({readWrite: 15, write: 0, read: 14, change: 0}),
  ).toContain('exigem chave');
  expect(
    writeAccessSummary({readWrite: 15, write: 15, read: 14, change: 0}),
  ).toContain('sem acesso');
});

test('encrypted PICC fields are conditional, little endian and separate from public read access', () => {
  expect(ndefFileSettings(bytes(encrypted)).sdm).toEqual({
    options: 193,
    uidMirrored: true,
    counterMirrored: true,
    accessRights: {counterRetrieval: 15, metaRead: 1, fileRead: 2},
    piccDataOffset: 32,
    macInputOffset: 0,
    macOffset: 70,
  });
});

test('plaintext UID/counter, disabled counter mirror and optional limit are parsed without treating them as encrypted PICC', () => {
  const settings = ndefFileSettings(bytes(plain));
  expect(settings.sdm).toMatchObject({
    uidOffset: 16,
    counterOffset: 32,
    macInputOffset: 0,
    macOffset: 48,
  });
  const hiddenCounter = bytes(plain);
  hiddenCounter.splice(13, 3, 255, 255, 255);
  expect(ndefFileSettings(hiddenCounter).sdm?.counterOffset).toBe(0xffffff);
  const limit = bytes(encrypted);
  limit[7] = 0xe1;
  limit.push(0x34, 0x12, 0);
  expect(ndefFileSettings(limit).sdm?.counterLimit).toBe(0x1234);
});

test('encrypted file data must be entirely within the MAC input and before the MAC mirror', () => {
  const data = bytes('0040F0E0000100D1FF12100000000000300000200000700000');
  expect(ndefFileSettings(data).sdm).toMatchObject({
    piccDataOffset: 16,
    encryptedDataOffset: 48,
    encryptedDataLength: 32,
    macOffset: 112,
  });
  data[16] = 31;
  expect(() => ndefFileSettings(data)).toThrow('inválidas');
});

test.each([
  '',
  '0040F0E0000100',
  '0002F0E0000100',
  '0080F0E0000100',
  '0000F6E0000100',
  '0000F0E0000000',
  base + '00',
  '0040F0E0000100C0FF12200000000000460000',
  '0040F0E0000100C1EF12200000000000460000',
  '0040F0E0000100C1FF15200000000000460000',
  '0040F0E0000100C1FF12200000000000300000',
  '0040F0E0000100C1FF12F00000000000460000',
  '0040F0E0000100C1FF12200000500000460000',
])(
  'malformed/reserved/truncated/overlapping settings are rejected (%s)',
  value => {
    expect(() => ndefFileSettings(value ? bytes(value) : [])).toThrow(
      'inválidas',
    );
  },
);

test('invalid native bytes never become decoded permissions', () => {
  expect(() => ndefFileSettings([0, 0, 240, 224, 0, 1, -1])).toThrow();
  expect(() => ndefFileSettings(Array(65).fill(0))).toThrow();
});

test('versioned plan calculates offsets in the file including NLEN, record header and URI prefix', () => {
  const plan = createSdmBenchPlan(id.toUpperCase());
  expect(plan).toEqual(example.plan);
  expect(plan.status).toBe('CANDIDATO_BANCADA');
  expect(plan.provisioningId).toBe(id);
  expect(plan.fileBytes.length).toBeLessThanOrEqual(256);
  expect(plan.fileBytes[0] * 256 + plan.fileBytes[1]).toBe(
    plan.messageBytes.length,
  );
  expect(utf8(wireNdefRecords(plan.messageBytes)[0].payload.slice(1))).toBe(
    plan.uriTemplate,
  );
  expect(
    String.fromCharCode(
      ...plan.fileBytes.slice(
        plan.offsets.piccData,
        plan.offsets.piccData + 32,
      ),
    ),
  ).toBe('0'.repeat(32));
  expect(
    String.fromCharCode(
      ...plan.fileBytes.slice(plan.offsets.mac, plan.offsets.mac + 16),
    ),
  ).toBe('0'.repeat(16));
  expect(plan.offsets.macInput).toBe(7);
  expect(plan.expectedSettings.sdm).toMatchObject({
    piccDataOffset: plan.offsets.piccData,
    macInputOffset: 7,
    macOffset: plan.offsets.mac,
    accessRights: {counterRetrieval: 15, metaRead: 1, fileRead: 2},
  });
  expect(plan.expectedSettings.accessRights).toEqual({
    readWrite: 15,
    change: 0,
    read: 14,
    write: 0,
  });
  expect(plan.expectedSettings.communication).toBe('FULL');
});

test.each([
  '',
  'not-uuid',
  '00000000-0000-0000-0000-000000000000',
  id + '?cmac=0',
])(
  'arbitrary IDs or client query additions do not generate a profile (%s)',
  value => {
    expect(() => createSdmBenchPlan(value)).toThrow('UUID');
  },
);

function message(plan = createSdmBenchPlan(id)) {
  const observed = [...plan.messageBytes];
  // Fake dynamic hex, deliberately not a cryptographic/public/physical vector.
  observed.splice(
    plan.offsets.piccData - 2,
    32,
    ...Array.from('abcdef0123456789'.repeat(2), char => char.charCodeAt(0)),
  );
  observed.splice(
    plan.offsets.mac - 2,
    16,
    ...Array.from('FEDCBA9876543210', char => char.charCodeAt(0)),
  );
  return observed;
}

test('structural comparison never authenticates or physically accepts matching dynamic hex', () => {
  const plan = createSdmBenchPlan(id);
  expect(
    compareSdmLayout(plan, plan.expectedSettings, message()),
  ).toMatchObject({
    layoutMatches: true,
    authenticated: false,
    physicallyAccepted: false,
    differences: [],
  });
});

test('different provisioning, record encoding, prefix or static MAC input is detected without masking it away', () => {
  const plan = createSdmBenchPlan(id);
  const changed = message();
  changed[20] = 0x58;
  expect(
    compareSdmLayout(plan, plan.expectedSettings, changed).differences,
  ).toContain('CONTEUDO_ESTATICO_DIVERGENTE');
  const other = createSdmBenchPlan('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  expect(
    compareSdmLayout(plan, plan.expectedSettings, message(other)).layoutMatches,
  ).toBe(false);
  expect(
    compareSdmLayout(plan, plan.expectedSettings, [...changed, 0])
      .layoutMatches,
  ).toBe(false);
});

test('dynamic format, permissions, offsets and plan tampering remain distinguishable', () => {
  const plan = createSdmBenchPlan(id);
  const invalidMessage = message();
  invalidMessage[plan.offsets.piccData - 2] = 0x7a;
  expect(
    compareSdmLayout(plan, plan.expectedSettings, invalidMessage).differences,
  ).toEqual(['CAMPO_DINAMICO_FORA_DO_FORMATO_HEX']);
  expect(
    compareSdmLayout(plan, ndefFileSettings(bytes(base)), message())
      .differences,
  ).toEqual(['PERMISSOES_OU_OFFSETS_DIVERGENTES']);
  expect(() =>
    compareSdmLayout(
      {...plan, offsets: {...plan.offsets, macInput: plan.offsets.mac}},
      plan.expectedSettings,
      message(),
    ),
  ).toThrow('alterado');
});
