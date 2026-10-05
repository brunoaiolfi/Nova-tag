import {Ndef, NdefStatus} from 'react-native-nfc-manager';
import manager from 'react-native-nfc-manager';
import {decodeReference, readPhysicalTag} from '../src/infra/nfc/reader';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {executionEnvironment: 'bare'},
  ExecutionEnvironment: {StoreClient: 'storeClient'},
}));
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  Ndef: jest.requireActual('react-native-nfc-manager/ndef-lib'),
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
test('physical read returns normalized UID/NDEF and closes native session', async () => {
  expect(await readPhysicalTag()).toEqual({
    uid,
    ndef: reference,
    tecnologias: ['mifare'],
  });
  expect(manager.cancelTechnologyRequest).toHaveBeenCalledTimes(1);
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
