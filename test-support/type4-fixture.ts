import {hex} from '../src/domain/nfc/type4';

// Synthetic protocol simulator for tests only. No physical tag or SDM proof.
export function type4Fixture(
  message: number[],
  options: {
    readAccess?: number;
    length?: number;
    shortRead?: boolean;
    failAfter?: number;
  } = {},
) {
  const cc = [
    0,
    15,
    0x20,
    0,
    15,
    0,
    59,
    4,
    6,
    0xe1,
    4,
    0x10,
    0,
    options.readAccess ?? 0,
    0,
  ];
  const length = options.length ?? message.length;
  const file = [Math.floor(length / 256), length % 256, ...message];
  let selected = 0;
  const commands: number[][] = [];
  const transceive = jest.fn(async (command: number[]) => {
    commands.push([...command]);
    if (options.failAfter !== undefined && commands.length > options.failAfter)
      throw new Error('fixture: connection interrupted');
    if (hex(command) === '00A4040C07D276000085010100') return [0x90, 0];
    if (command[1] === 0xa4 && command[2] === 0) {
      selected = command[5] * 256 + command[6];
      return [0x90, 0];
    }
    if (command[1] === 0xb0) {
      const source = selected === 0xe103 ? cc : file;
      const offset = command[2] * 256 + command[3];
      return [
        ...source.slice(
          offset,
          offset + command[4] - (options.shortRead ? 1 : 0),
        ),
        0x90,
        0,
      ];
    }
    throw new Error('fixture: unexpected command ' + hex(command));
  });
  return {transceive, commands};
}
