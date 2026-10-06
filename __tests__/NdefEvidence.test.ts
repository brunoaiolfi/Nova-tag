import {
  wireNdefRecords,
  bytesBase64,
  utf8,
  ndefText,
} from '../src/domain/nfc/ndef';
import {readType4Ndef} from '../src/appplication/nfc/read-type4-ndef';
import {type4Fixture} from '../test-support/type4-fixture';
import {hex} from '../src/domain/nfc/type4';

// Synthetic URI "abc" in short and long record encodings. Both decode to the
// same URI, but the original messages must never become interchangeable bytes.
const short = [0xd1, 1, 4, 0x55, 0, 0x61, 0x62, 0x63];
const long = [0xc1, 1, 0, 0, 0, 4, 0x55, 0, 0x61, 0x62, 0x63];
test('Unicode text stays exact with UTF-8, UTF-16 BE/LE and surrogate pairs', () => {
  expect(utf8([...Buffer.from('aç📦', 'utf8')])).toBe('aç📦');
  expect(
    ndefText([0x82, 0x65, 0x6e, 0xfe, 0xff, 0, 0xe7, 0xd8, 0x3d, 0xdc, 0xe6]),
  ).toBe('ç📦');
  expect(
    ndefText([0x82, 0x65, 0x6e, 0xff, 0xfe, 0xe7, 0, 0x3d, 0xd8, 0xe6, 0xdc]),
  ).toBe('ç📦');
});
test.each([
  [0xc0, 0x80],
  [0xe0, 0x80, 0x80],
  [0xed, 0xa0, 0x80],
  [0xf4, 0x90, 0x80, 0x80],
  [0x80],
  [0xe2, 0x82],
  [0xc3, 0x41],
])(
  'invalid UTF-8 cannot create text with replacement/lost bytes: %#',
  (...bytes) => {
    expect(() => utf8(bytes)).toThrow('NDEF inválida');
  },
);
test('short/long wire encodings parse equally but retain different evidence', () => {
  expect(wireNdefRecords(short)).toEqual(wireNdefRecords(long));
  expect(bytesBase64(short)).toBe(Buffer.from(short).toString('base64'));
  expect(bytesBase64(long)).not.toBe(bytesBase64(short));
  expect(long[0]).toBe(0xc1);
});
test('multiple records, identifiers, chunked payloads and empty messages are bounded', () => {
  const multi = [0x91, 1, 2, 0x55, 0, 0x61, 0x59, 1, 2, 1, 0x55, 0x7a, 0, 0x62];
  expect(wireNdefRecords(multi)).toHaveLength(2);
  expect(wireNdefRecords(multi)[1].id).toEqual([0x7a]);
  expect(
    wireNdefRecords([0xb1, 1, 2, 0x55, 0, 0x61, 0x56, 0, 2, 0x62, 0x63]),
  ).toEqual(wireNdefRecords(short));
  expect(wireNdefRecords([])).toEqual([]);
  expect(wireNdefRecords([0xd0, 0, 0])).toEqual([
    {tnf: 0, type: [], id: [], payload: []},
  ]);
});
test.each([
  [0xd1],
  short.slice(0, -1),
  [0x51, ...short.slice(1)],
  [0x91, ...short.slice(1)],
  [...short, 0],
  [0xf1, ...short.slice(1)],
  [0xd7, ...short.slice(1)],
  [0xd6, 0, 0],
  [0xd5, 1, 0, 0x55],
  [0xd0, 0, 1, 0],
  [0xc1, 1, 0xff, 0xff, 0xff, 0xff, 0x55],
  [0xb1, 1, 2, 0x55, 0, 0x61, 0x51, 1, 1, 0x55, 0x62],
  [256],
  Array(4097).fill(0),
])('malformed/truncated wire message is rejected: %#', (...args: number[]) => {
  expect(() => wireNdefRecords(args)).toThrow('NDEF inválida');
});
test.each([
  ['', []],
  ['Zg==', [102]],
  ['Zm8=', [102, 111]],
  ['Zm9v', [102, 111, 111]],
])('canonical Base64 vector %s', (value, bytes) => {
  expect(bytesBase64(bytes as number[])).toBe(value);
});
test('operational Type 4 stream reads exact bytes using only SELECT and consecutive READ_BINARY', async () => {
  const port = type4Fixture(long);
  expect((await readType4Ndef(port)).bytes).toEqual(long);
  expect(
    port.commands.every(command => [0xa4, 0xb0].includes(command[1])),
  ).toBe(true);
  const ndefSelect = port.commands.findIndex(
    command => hex(command) === '00A4000C02E10400',
  );
  expect(
    port.commands.slice(ndefSelect + 1).every(command => command[1] === 0xb0),
  ).toBe(true);
  expect(port.commands.slice(ndefSelect + 1).map(hex)).toEqual([
    '00B0000002',
    '00B000020B',
  ]);
});
test('long fragmented reads retain the entire message, without issuing a new command between fragments', async () => {
  const message = [...long, ...Array(200).fill(0x61)];
  const port = type4Fixture(message);
  expect((await readType4Ndef(port)).bytes).toEqual(message);
  expect(
    port.commands
      .filter(command => command[1] === 0xb0)
      .every(command => command[4] <= 15),
  ).toBe(true);
});
test.each([
  {readAccess: 255},
  {length: 4095},
  {length: 5000},
  {shortRead: true},
  {failAfter: 6},
])(
  'partial, protected or excessive data never produces complete evidence: %j',
  async options => {
    await expect(readType4Ndef(type4Fixture(short, options))).rejects.toThrow();
  },
);
