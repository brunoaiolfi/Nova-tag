import manager from 'react-native-nfc-manager';
import {
  NativeAdministrativeNfc,
  identifyAdministrativeTag,
} from '../src/infra/nfc/administration';
import {cancelPhysicalRead} from '../src/infra/nfc/reader';
import {operation, provisioning} from '../tests/support/administration';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {executionEnvironment: 'bare'},
  ExecutionEnvironment: {StoreClient: 'storeClient'},
}));
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  NfcError: jest.requireActual('react-native-nfc-manager/src/NfcError'),
  NfcTech: {IsoDep: 'IsoDep'},
  default: {
    start: jest.fn(),
    isSupported: jest.fn(),
    isEnabled: jest.fn(),
    requestTechnology: jest.fn(),
    getTag: jest.fn(),
    cancelTechnologyRequest: jest.fn(),
    isoDepHandler: {transceive: jest.fn()},
  },
}));
const hardware = [4, 4, 2, 0x30, 0, 0x11, 5],
  software = [4, 4, 2, 1, 2, 0x11, 5],
  uid = provisioning.uid.match(/../g)!.map(x => parseInt(x, 16));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(manager.isSupported).mockResolvedValue(true);
  jest.mocked(manager.isEnabled).mockResolvedValue(true);
  jest.mocked(manager.getTag).mockResolvedValue({id: provisioning.uid});
  jest.mocked(manager.requestTechnology).mockResolvedValue('IsoDep' as never);
  jest.mocked(manager.cancelTechnologyRequest).mockResolvedValue(undefined);
  let frame = 0;
  jest.mocked(manager.isoDepHandler.transceive).mockImplementation(
    async () =>
      [
        [0x90, 0],
        [...hardware, 0x91, 0xaf],
        [...software, 0x91, 0xaf],
        [...uid, ...Array(7).fill(0), 0x91, 0],
      ][frame++] ?? [0x91, 0],
  );
});
afterEach(async () => {
  await cancelPhysicalRead();
});
test('preflight selects Type 4 and declares the chip without reading NDEF or advancing SDM', async () => {
  expect((await identifyAdministrativeTag()).uid).toBe(provisioning.uid);
  expect(manager.requestTechnology).toHaveBeenCalledWith(
    'IsoDep',
    expect.anything(),
  );
  expect(manager.isoDepHandler.transceive).toHaveBeenCalledTimes(4);
  expect(
    jest
      .mocked(manager.isoDepHandler.transceive)
      .mock.calls.some(([b]) => b[1] === 0xb0 || b[1] === 0xad),
  ).toBe(false);
});
test('incompatible model and wrong UID stop before application commands', async () => {
  const work = jest.fn();
  jest.mocked(manager.getTag).mockResolvedValue({id: '53721F76950001'});
  await expect(
    new NativeAdministrativeNfc().run(operation, work),
  ).rejects.toMatchObject({code: 'NFC_INVALID_UID'});
  expect(work).not.toHaveBeenCalled();
  jest.mocked(manager.getTag).mockResolvedValue({id: provisioning.uid});
  jest.mocked(manager.isoDepHandler.transceive).mockResolvedValue([0x91, 0xae]);
  await expect(
    new NativeAdministrativeNfc().run(operation, work),
  ).rejects.toBeDefined();
  expect(work).not.toHaveBeenCalled();
});
test('application rejection preserves its actionable error through the native adapter', async () => {
  await expect(
    new NativeAdministrativeNfc().run(operation, async () => {
      throw new Error('SQLite storage full');
    }),
  ).rejects.toThrow('SQLite storage full');
});
test('cancellation waits for the late response to be consumed before releasing the administrative job', async () => {
  let resolveResponse!: (value: number[]) => void, started!: () => void;
  const waiting = new Promise<void>(r => {
      started = r;
    }),
    events: string[] = [];
  const run = new NativeAdministrativeNfc().run(operation, async rf => {
    jest.mocked(manager.isoDepHandler.transceive).mockImplementation(
      () =>
        new Promise<number[]>(r => {
          resolveResponse = r;
          started();
        }),
    );
    const response = await rf.transceive([
      0x90,
      0x51,
      0,
      0,
      8,
      ...Array(8).fill(0),
      0,
    ]);
    events.push('response consumed');
    expect(response).toEqual([0x91, 0]);
    rf.checkpoint();
  });
  const result = run.catch(e => {
    events.push('job ended');
    return e;
  });
  await waiting;
  await cancelPhysicalRead();
  expect(events).toEqual([]);
  resolveResponse([0x91, 0]);
  expect(await result).toMatchObject({code: 'NFC_CANCELLED'});
  expect(events).toEqual(['response consumed', 'job ended']);
});
