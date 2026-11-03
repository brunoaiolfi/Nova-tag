import type {AdminReply} from './contracts/admin-reply.types';
import {decodeReply} from './contracts/reply-decoder';
import {invalid} from '../../domain/administration/invalid-contract';

export function assertSessionReply(
  value: unknown,
  sessionId: string,
): asserts value is AdminReply {
  const reply = decodeReply(value);
  if (reply.sessaoId !== sessionId) invalid();
}
