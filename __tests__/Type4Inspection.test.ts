import {inspectType4} from '../src/appplication/nfc/inspect-type4';
import {NfcFailure} from '../src/domain/nfc/failure';
import {
  capabilityContainer,
  hex,
  response,
  tagVersion,
} from '../src/domain/nfc/type4';

const bytes = (value: string) =>
  value.match(/../g)!.map(byte => parseInt(byte, 16));
// Public protocol vector: NXP AN12196 Rev. 2, section 5.5, Table 12.
const version = [
  '0404083000110591AF',
  '0404020101110591AF',
  '04968CAA5C5E80CD65935D4021189100',
];
// Synthetic Type 4 CC and message fixtures, not evidence from the laboratory lot.
const cc = bytes('000F20000F003B0406E10401000000');
const ndef = bytes('D101045500616263'); // URI record: "abc".

function fixture(
  options: {
    versions?: string[];
    cc?: number[];
    ndef?: number[];
    length?: number;
    shortRead?: boolean;
    settings?: string;
  } = {},
) {
  let selected = 0;
  let frame = 0;
  const commands: string[] = [];
  const data = options.ndef ?? ndef;
  const length = options.length ?? data.length;
  const file = [Math.floor(length / 256), length % 256, ...data];
  const transceive = jest.fn(async (command: number[]) => {
    const encoded = hex(command);
    commands.push(encoded);
    if (encoded === '00A4040C07D276000085010100') {
      return bytes('9000');
    }
    if (encoded === '9060000000' || encoded === '90AF000000') {
      return bytes((options.versions ?? version)[frame++]);
    }
    if (encoded === '90F50000010200') {
      // Synthetic configured permissions, not proof of physical protection.
      return bytes(options.settings ?? '000000E00001009100');
    }
    if (command[1] === 0xa4 && command[2] === 0) {
      selected = command[5] * 256 + command[6];
      return bytes('9000');
    }
    if (command[1] === 0xb0) {
      const start = command[2] * 256 + command[3];
      const source = selected === 0xe103 ? options.cc ?? cc : file;
      const count = options.shortRead ? command[4] - 1 : command[4];
      return [...source.slice(start, start + count), ...bytes('9000')];
    }
    throw new Error(`Unexpected or non-read-only command ${encoded}`);
  });
  return {transceive, commands};
}

test('public GET_VERSION and original NDEF bytes are read without write/auth commands', async () => {
  const port = fixture();
  const result = await inspectType4(port);
  expect(result.version.value).toMatchObject({
    compatibleNtag424: true,
    productionUid: '04968CAA5C5E80',
    uidHidden: false,
  });
  expect(result.ndef.bytes).toEqual(ndef);
  expect(result.ndef.file).toEqual({
    fileId: 0xe104,
    maximumFileSize: 256,
    maximumReadSize: 15,
    readAccess: 0,
    writeAccess: 0,
  });
  expect(port.commands.slice(0, 4)).toEqual([
    '00A4040C07D276000085010100',
    '9060000000',
    '90AF000000',
    '90AF000000',
  ]);
  expect(result.exchanges).toHaveLength(port.commands.length);
  expect(
    port.commands.every(command => /^(00A4|00B0|9060|90AF|90F5)/.test(command)),
  ).toBe(true);
});

test('file settings are queried only for a compatible model, before consecutive NDEF reads', async () => {
  const port = fixture();
  const report = await inspectType4(port);
  expect(report.fileSettings.value).toMatchObject({
    fileNumber: 2,
    fileSize: 256,
    accessRights: {read: 14, write: 0, readWrite: 0, change: 0},
  });
  expect(port.commands[4]).toBe('90F50000010200');
  const lastSelection = port.commands.lastIndexOf('00A4000C02E10400');
  expect(
    port.commands
      .slice(lastSelection + 1)
      .every(command => command.startsWith('00B0')),
  ).toBe(true);
  const unknown = fixture({
    versions: ['5304083000110591AF', version[1], version[2]],
  });
  expect((await inspectType4(unknown)).fileSettings.value).toBeUndefined();
  expect(unknown.commands).not.toContain('90F50000010200');
});

test.each(['919D', '000000E0009100', '91AF'])(
  'unavailable or incomplete settings %s preserve independent NDEF diagnosis without authentication',
  async settings => {
    const port = fixture({settings});
    const report = await inspectType4(port);
    expect(report.fileSettings.value).toBeUndefined();
    expect(report.fileSettings.code).toBeDefined();
    expect(report.ndef.bytes).toEqual(ndef);
    expect(
      port.commands.filter(command => command.startsWith('90AF')),
    ).toHaveLength(2);
  },
);

test('physical loss during file settings aborts the diagnostic before NDEF reads', async () => {
  const port = fixture();
  const exchange = port.transceive;
  const transceive = async (command: number[]) => {
    if (command[1] === 0xf5) throw new NfcFailure('NFC_TAG_LOST', 'removed');
    return exchange(command);
  };
  await expect(inspectType4({transceive})).rejects.toMatchObject({
    code: 'NFC_TAG_LOST',
  });
  expect(port.commands.some(command => command.startsWith('00B0'))).toBe(false);
});

test('unknown vendor is not labeled NTAG 424 and an unavailable GET_VERSION still permits independent NDEF diagnosis', async () => {
  const unknown = await inspectType4(
    fixture({versions: ['5304083000110591AF', version[1], version[2]]}),
  );
  expect(unknown.version.value?.compatibleNtag424).toBe(false);
  const unavailable = await inspectType4(fixture({versions: ['6D00']}));
  expect(unavailable.version).toMatchObject({code: 'NFC_UNSUPPORTED_TAG'});
  expect(unavailable.ndef.bytes).toEqual(ndef);
});

test('malformed or endlessly chained versions are bounded and never confirm the chip', async () => {
  const short = fixture({versions: ['040491AF']});
  expect((await inspectType4(short)).version).toMatchObject({
    code: 'NFC_INVALID_RESPONSE',
  });
  expect(
    short.commands.filter(command => command === '90AF000000'),
  ).toHaveLength(0);
  const chained = fixture({
    versions: [version[0], version[1], '04968CAA5C5E80CD65935D40211891AF'],
  });
  expect((await inspectType4(chained)).version.value).toBeUndefined();
  expect(
    chained.commands.filter(command => command === '90AF000000'),
  ).toHaveLength(2);
});

test('random or hidden production UID is reported, not inferred from manufacturer bytes', () => {
  const frames = version.map(value => response(bytes(value)).data);
  expect(
    tagVersion([
      frames[0],
      frames[1],
      [...Array(7).fill(0), ...frames[2].slice(7)],
    ]),
  ).toMatchObject({uidHidden: true, productionUid: '00000000000000'});
  expect(() => tagVersion([frames[0]])).toThrow('incompletos');
  expect(() => response([300, 0x90, 0])).toThrow('inválida');
});

test('CC and NLEN bounds prevent excessive or truncated reads', async () => {
  const oversized = fixture({length: 257});
  expect((await inspectType4(oversized)).ndef).toMatchObject({
    code: 'NFC_INVALID_RESPONSE',
  });
  expect(oversized.commands).not.toContain('00B000020F');
  expect((await inspectType4(fixture({shortRead: true}))).ndef).toMatchObject({
    code: 'NFC_INVALID_RESPONSE',
  });
  const badCc = [...cc];
  badCc[1] = 255;
  expect(() => capabilityContainer(badCc)).toThrow('inválido');
  const badTlv = [...cc];
  badTlv[8] = 7;
  expect(() => capabilityContainer(badTlv)).toThrow('inválido');
});

test('non-public read access is reported without authentication; write restrictions are preserved', async () => {
  const protectedCc = [...cc];
  protectedCc[13] = 255;
  protectedCc[14] = 255;
  const port = fixture({cc: protectedCc});
  const result = await inspectType4(port);
  expect(result.ndef).toMatchObject({
    code: 'NFC_ACCESS_DENIED',
    file: {writeAccess: 255},
  });
  expect(result.ndef.bytes).toBeUndefined();
  expect(port.commands).not.toContain('00A4000C02E10400');
});

test('multi-chunk messages retain exact raw bytes and respect maximum read size', async () => {
  const data = Array.from({length: 70}, (_, index) => index);
  const port = fixture({ndef: data});
  expect((await inspectType4(port)).ndef.bytes).toEqual(data);
  const reads = port.commands.filter(command => command.startsWith('00B0'));
  expect(reads.every(command => parseInt(command.slice(-2), 16) <= 15)).toBe(
    true,
  );
  expect(reads).toContain('00B0003E0A');
});

test('physical loss aborts instead of returning a successful partial report', async () => {
  const port = fixture();
  port.transceive.mockRejectedValueOnce(
    new NfcFailure('NFC_TAG_LOST', 'removed'),
  );
  await expect(inspectType4(port)).rejects.toMatchObject({
    code: 'NFC_TAG_LOST',
  });
});
