import {decodeOperation} from '../src/appplication/administration/contracts/operation-decoder';
import {assertOperation} from '../src/appplication/administration/operation-owner-policy';
import {decodeReply} from '../src/appplication/administration/contracts/reply-decoder';
import {assertSessionReply} from '../src/appplication/administration/rf-session-policy';
import {commandBytes} from '../src/domain/nfc/administrative-command';
import {isSession} from '../src/appplication/auth/session-decoder';
import {
  operation,
  context,
  reply,
  session,
  frame,
  localDatabase,
  id,
} from '../tests/support/administration';

test.each([
  null,
  [],
  1,
  'operation',
  {},
  {plano: 'invalid'},
  {...operation, plano: {...operation.plano, epoca: '1'}},
  {...operation, alteracaoEmitida: 1},
])(
  'operation decoder rejects malformed external data without trusting a cast: %p',
  value => {
    expect(() => decodeOperation(value)).toThrow('incompatível');
  },
);
test('format validation and execution owner policy are independent', () => {
  expect(decodeOperation(operation)).toEqual(operation);
  expect(() =>
    assertOperation(operation, {...context, userId: id(99)}),
  ).toThrow('incompatível');
});
test.each([
  null,
  [],
  {},
  {...reply(), sessaoId: 1},
  {...reply(), comando: {...frame, alteraTag: true}},
  {
    ...reply(session.id, null),
    resultado: {...reply(session.id, null).resultado, slotsAutenticados: [0]},
  },
])('reply decoder rejects malformed or unsafe variants: %p', value => {
  expect(() => decodeReply(value)).toThrow('incompatível');
});
test('reply must belong to the expected RF session', () => {
  expect(decodeReply(reply())).toEqual(reply());
  expect(() => assertSessionReply(reply(), id(99))).toThrow('incompatível');
});
test.each([
  null,
  [],
  {...frame, sequencia: '1'},
  {...frame, alteraTag: true},
  {...frame, apduHex: '905C00000000'},
  {...frame, apduHex: '90C400002900' + '00'.repeat(40) + '00'},
])(
  'APDU parser rejects invalid input or unsupported instructions: %p',
  value => {
    expect(() => commandBytes(value)).toThrow('incompatível');
  },
);
test('persisted operations are decoded again when rehydrated', async () => {
  const {db, store, sql} = localDatabase();
  try {
    await store.initialize();
    await store.saveOperation(operation, context);
    await sql.run('UPDATE admin_operations SET snapshot=? WHERE id=?', [
      JSON.stringify({...operation, plano: null}),
      operation.id,
    ]);
    await expect(store.operation(operation.id, context)).rejects.toThrow(
      'incompatível',
    );
  } finally {
    db.close();
  }
});
test.each([null, [], {user: 'invalid'}, {token: {}, user: []}])(
  'stored session rejects invalid values: %p',
  value => {
    expect(isSession(value)).toBe(false);
  },
);
