import type {FileAccessRights} from './file-settings';

export type AccessRequirement =
  | {kind: 'free'}
  | {kind: 'blocked'}
  | {kind: 'key'; slot: number};
export type WriteAccess = 'free' | 'blocked' | 'key';
export function accessRequirement(right: number): AccessRequirement {
  if (right === 14) return {kind: 'free'};
  if (right === 15) return {kind: 'blocked'};
  return {kind: 'key', slot: right};
}
/** Both Write and ReadWrite are effective routes to modify the file. */
export function writeAccess(rights: FileAccessRights): WriteAccess {
  if (rights.write === 14 || rights.readWrite === 14) return 'free';
  if (rights.write === 15 && rights.readWrite === 15) return 'blocked';
  return 'key';
}
