import {Ndef, NdefStatus, NfcError} from 'react-native-nfc-manager';
import manager from 'react-native-nfc-manager';
import {type4Fixture} from '../test-support/type4-fixture';
import {bytesBase64} from '../src/domain/nfc/ndef';
import {diagnosePhysicalTag} from '../src/infra/nfc/diagnostics';
import {
  cancelPhysicalRead,
  decodeReference,
  nativeFailure,
  readPhysicalTag,
} from '../src/infra/nfc/reader';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'bare',
    platform: {ios: {buildNumber: 'native-1'}, android: {versionCode: 1}},
    expoConfig: {version: '0.2.0', ios: {buildNumber: 'manifest-2'}},
  },
  ExecutionEnvironment: {StoreClient: 'storeClient'},
}));
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  Ndef: jest.requireActual('react-native-nfc-manager/ndef-lib'),
  NfcError: jest.requireActual('react-native-nfc-manager/src/NfcError'),
  NfcTech: {
    Ndef: 'Ndef',
    IsoDep: 'IsoDep',
    NfcA: 'NfcA',
    NfcV: 'NfcV',
    Iso15693IOS: 'Iso15693IOS',
  },
  NdefStatus: {NotSupported: 1, ReadWrite: 2, ReadOnly: 3},
  default: {
    start: jest.fn(),
    isSupported: jest.fn(),
    isEnabled: jest.fn(),
    requestTechnology: jest.fn(),
    getTag: jest.fn(),
    cancelTechnologyRequest: jest.fn(),
    isoDepHandler: {transceive: jest.fn()},
    ndefHandler: {
      getNdefStatus: jest.fn(),
      getNdefMessage: jest.fn(),
      writeNdefMessage: jest.fn(),
    },
  },
}));
const uid = '04A1B2C3D4E5F6';
const reference =
  'urn:nfc-trace:provisioning:00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(manager.isSupported).mockResolvedValue(true);
  jest.mocked(manager.isEnabled).mockResolvedValue(true);
  jest.mocked(manager.requestTechnology).mockResolvedValue('Ndef' as never);
  jest.mocked(manager.cancelTechnologyRequest).mockResolvedValue(undefined);
  jest.mocked(manager.getTag).mockResolvedValue({id: uid, tech: 'mifare'});
  jest
    .mocked(manager.ndefHandler.getNdefStatus)
    .mockResolvedValue({status: NdefStatus.ReadWrite, capacity: 512});
  jest
    .mocked(manager.ndefHandler.getNdefMessage)
    .mockResolvedValue({ndefMessage: [Ndef.uriRecord(reference)]});
});
test('decodes real URI and Text records and rejects ambiguous references', () => {
  expect(decodeReference([Ndef.uriRecord(reference)], Ndef)).toBe(reference);
  expect(decodeReference([Ndef.textRecord(reference)], Ndef)).toBe(reference);
  expect(() =>
    decodeReference(
      [Ndef.uriRecord(reference), Ndef.textRecord(reference)],
      Ndef,
    ),
  ).toThrow('múltiplas');
});

test('URI UTF-8 and UTF-16 text remain exact; invalid prefixes/language bounds cannot masquerade as a reference', () => {
  const unicode = 'https://exemplo.test/📦';
  expect(decodeReference([Ndef.uriRecord(unicode)], Ndef)).toBe(unicode);
  const text = [
    0x82,
    0x65,
    0x6e,
    0xfe,
    0xff,
    ...Array.from(reference).flatMap(letter => [0, letter.charCodeAt(0)]),
  ];
  expect(decodeReference([{tnf: 1, type: [0x54], payload: text}], Ndef)).toBe(
    reference,
  );
  expect(() =>
    decodeReference(
      [
        {
          tnf: 1,
          type: [0x55],
          payload: [0xff, ...Ndef.uriRecord(reference).payload.slice(1)],
        },
      ],
      Ndef,
    ),
  ).toThrow('Prefixo URI');
  expect(() =>
    decodeReference([{tnf: 1, type: [0x54], payload: [63, 0x65]}], Ndef),
  ).toThrow('NDEF inválida');
});
test('physical read returns normalized UID/NDEF and closes native session', async () => {
  expect(await readPhysicalTag()).toEqual({
    uid,
    ndef: reference,
    tecnologias: ['mifare'],
  });
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});

test('operational IsoDep reads preserve original long-record bytes and derive URI from that same message', async () => {
  jest.mocked(manager.requestTechnology).mockResolvedValue('IsoDep' as never);
  jest.mocked(manager.getTag).mockResolvedValue({
    id: uid,
    tech: 'IsoDep',
    ndefMessage: [Ndef.uriRecord('urn:old-sdk-read')],
  });
  const payload = Ndef.uriRecord(reference).payload;
  const wire = [0xc1, 1, 0, 0, 0, payload.length, 0x55, ...payload];
  const port = type4Fixture(wire);
  jest
    .mocked(manager.isoDepHandler.transceive)
    .mockImplementation(port.transceive);
  expect(await readPhysicalTag()).toEqual({
    uid,
    ndef: reference,
    tecnologias: ['IsoDep'],
    bytesBase64: bytesBase64(wire),
  });
  expect(bytesBase64(wire)).not.toBe(
    bytesBase64(Ndef.encodeMessage([Ndef.uriRecord(reference)])!),
  );
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
  expect(manager.ndefHandler.getNdefStatus).toHaveBeenCalledTimes(1);
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});

test('malformed/protected Type 4 data cannot fall back to decoded SDK records', async () => {
  jest.mocked(manager.requestTechnology).mockResolvedValue('IsoDep' as never);
  jest
    .mocked(manager.isoDepHandler.transceive)
    .mockImplementation(type4Fixture([0xd1], {readAccess: 255}).transceive);
  await expect(readPhysicalTag()).rejects.toMatchObject({
    code: 'NFC_ACCESS_DENIED',
  });
  jest
    .mocked(manager.isoDepHandler.transceive)
    .mockImplementation(type4Fixture([0xd1]).transceive);
  await expect(readPhysicalTag()).rejects.toMatchObject({
    code: 'NFC_INVALID_RESPONSE',
  });
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
});

test('cancellation during a pending raw read never returns evidence or issues another fragment', async () => {
  jest.mocked(manager.requestTechnology).mockResolvedValue('IsoDep' as never);
  const wire = Ndef.encodeMessage([Ndef.uriRecord(reference)])!;
  const port = type4Fixture(wire);
  let finish!: () => void;
  let started!: () => void;
  const pending = new Promise<void>(resolve => {
    started = resolve;
  });
  jest
    .mocked(manager.isoDepHandler.transceive)
    .mockImplementation(async command => {
      const response = await port.transceive(command);
      if (command[1] === 0xb0 && command[2] === 0 && command[3] === 2) {
        started();
        await new Promise<void>(resolve => {
          finish = resolve;
        });
      }
      return response;
    });
  const read = readPhysicalTag().catch(error => error);
  await pending;
  const calls = port.commands.length;
  await cancelPhysicalRead();
  await expect(read).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  finish();
  for (let tick = 0; tick < 20; tick++) await Promise.resolve();
  expect(port.commands).toHaveLength(calls);
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
});

test('non-Type-4 reading never manufactures original bytes from SDK records', async () => {
  const reading = await readPhysicalTag();
  expect(reading.bytesBase64).toBeUndefined();
  expect(manager.isoDepHandler.transceive).not.toHaveBeenCalled();
  expect(reading.ndef).toBe(reference);
});

test('an unformatted IsoDep tag remains readable for UID without inventing NDEF bytes', async () => {
  jest.mocked(manager.requestTechnology).mockResolvedValue('IsoDep' as never);
  jest
    .mocked(manager.ndefHandler.getNdefStatus)
    .mockResolvedValue({status: NdefStatus.NotSupported, capacity: 0});
  expect(await readPhysicalTag()).toEqual({uid, tecnologias: ['mifare']});
  expect(manager.isoDepHandler.transceive).not.toHaveBeenCalled();
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
});
test('writes server URI and verifies physical reread', async () => {
  await readPhysicalTag({uid, reference});
  expect(manager.ndefHandler.writeNdefMessage).toHaveBeenCalledWith(
    Ndef.encodeMessage([Ndef.uriRecord(reference)]),
  );
  expect(manager.ndefHandler.getNdefMessage).toHaveBeenCalled();
});
test('never writes a different tag and closes session on error', async () => {
  jest.mocked(manager.getTag).mockResolvedValue({id: '04FFFFFFFFFFFF'});
  await expect(readPhysicalTag({uid, reference})).rejects.toThrow('diferente');
  expect(manager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});
test('failed physical verification does not report successful write', async () => {
  jest
    .mocked(manager.ndefHandler.getNdefMessage)
    .mockResolvedValue({ndefMessage: [Ndef.uriRecord('urn:other')]});
  await expect(readPhysicalTag({uid, reference})).rejects.toThrow('releitura');
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});
test('read-only tag with exact reference can be retried without rewriting', async () => {
  jest
    .mocked(manager.ndefHandler.getNdefStatus)
    .mockResolvedValue({status: NdefStatus.ReadOnly, capacity: 512});
  await readPhysicalTag({uid, reference});
  expect(manager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
});
test('unsupported NDEF does not invent a reference', async () => {
  jest
    .mocked(manager.ndefHandler.getNdefStatus)
    .mockResolvedValue({status: NdefStatus.NotSupported, capacity: 0});
  expect(await readPhysicalTag()).toEqual({uid, tecnologias: ['mifare']});
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
});

test('cancelling while NFC support is being checked prevents the native sheet opening', async () => {
  let complete!: (value: boolean) => void;
  jest.mocked(manager.isSupported).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        complete = resolve;
      }),
  );
  const reading = readPhysicalTag();
  const rejected = reading.catch(error => error);
  for (let tick = 0; tick < 8; tick++) {
    await Promise.resolve();
  }
  await cancelPhysicalRead();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  complete(true);
  for (let tick = 0; tick < 12; tick++) {
    await Promise.resolve();
  }
  expect(manager.requestTechnology).not.toHaveBeenCalled();
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});

test('cancellation during a pending write never reports physical confirmation', async () => {
  let complete!: () => void;
  jest.mocked(manager.ndefHandler.writeNdefMessage).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        complete = resolve;
      }),
  );
  const reading = readPhysicalTag({uid, reference});
  const rejected = reading.catch(error => error);
  for (let tick = 0; tick < 40; tick++) {
    await Promise.resolve();
  }
  expect(manager.ndefHandler.writeNdefMessage).toHaveBeenCalledTimes(1);
  await cancelPhysicalRead();
  complete();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  for (let tick = 0; tick < 12; tick++) {
    await Promise.resolve();
  }
  expect(manager.ndefHandler.getNdefMessage).not.toHaveBeenCalled();
});

test.each([
  [new NfcError.UserCancel(), 'NFC_CANCELLED'],
  [new NfcError.Timeout(), 'NFC_TIMEOUT'],
  [new NfcError.TagConnectionLost(), 'NFC_TAG_LOST'],
  [new NfcError.RadioDisabled(), 'NFC_DISABLED'],
  [new NfcError.UnsupportedFeature(), 'NFC_UNSUPPORTED_TAG'],
])('native error %p receives a stable code %s', (error, code) => {
  expect(
    nativeFailure(error, require('react-native-nfc-manager')),
  ).toMatchObject({code});
});

test('unknown native errors never expose internal error text to the operator', () => {
  expect(
    nativeFailure(
      new NfcError.NfcErrorBase('android.nfc.TagLostException: Tag was lost.'),
      require('react-native-nfc-manager'),
    ).code,
  ).toBe('NFC_TAG_LOST');
  const mapped = nativeFailure(
    new Error('internal native stack details'),
    require('react-native-nfc-manager'),
  );
  expect(mapped.code).toBe('NFC_FAILURE');
  expect(mapped.message).not.toContain('internal native stack');
});

test('diagnosis uses IsoDep, preserves unsupported status and reports the actual native build', async () => {
  jest.mocked(manager.isoDepHandler.transceive).mockResolvedValue([0x6a, 0x82]);
  const report = await diagnosePhysicalTag();
  expect(manager.requestTechnology).toHaveBeenCalledWith(
    'IsoDep',
    expect.anything(),
  );
  expect(report).toMatchObject({
    uid,
    version: {code: 'NFC_UNSUPPORTED_TAG'},
    ndef: {code: 'NFC_UNSUPPORTED_TAG'},
  });
  expect(report.device.nativeBuild).not.toBe('manifest-2');
  expect(report.device.nativeBuild).not.toBe('desconhecido');
  expect(report.exchanges).toEqual([
    {commandHex: '00A4040C07D276000085010100', responseHex: '6A82'},
  ]);
  expect(manager.ndefHandler.writeNdefMessage).not.toHaveBeenCalled();
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});

test('physical disconnection during diagnosis closes the session and never returns a report', async () => {
  jest
    .mocked(manager.isoDepHandler.transceive)
    .mockRejectedValueOnce(new NfcError.TagConnectionLost());
  await expect(diagnosePhysicalTag()).rejects.toMatchObject({
    code: 'NFC_TAG_LOST',
  });
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
});
