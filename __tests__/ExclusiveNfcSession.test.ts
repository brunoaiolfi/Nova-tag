import {
  ExclusiveNfcSession,
  SessionScheduler,
} from '../src/appplication/nfc/exclusive-session';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return {promise, resolve};
}
const flush = async () => {
  for (let step = 0; step < 12; step++) {
    await Promise.resolve();
  }
};
let timeout: () => void;
let stop: jest.Mock;
let session: ExclusiveNfcSession;
beforeEach(() => {
  stop = jest.fn();
  const scheduler: SessionScheduler = {
    schedule: (_, callback) => {
      timeout = callback;
      return stop;
    },
  };
  session = new ExclusiveNfcSession(scheduler);
});

test('cancellation during preflight never opens a later native request', async () => {
  const supported = deferred<boolean>();
  const request = jest.fn().mockResolvedValue(undefined);
  const close = jest.fn().mockResolvedValue(undefined);
  const result = session.run(async scope => {
    scope.onClose(close);
    await scope.step(() => supported.promise);
    await scope.step(request);
  });
  const rejected = result.catch(error => error);
  await flush();
  await session.cancel();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  supported.resolve(true);
  await flush();
  expect(request).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
  await expect(session.run(async () => 'next')).resolves.toBe('next');
});

test('timeout returns promptly but ownership remains until the native request settles', async () => {
  const request = deferred<string>();
  const close = jest.fn().mockResolvedValue(undefined);
  const next = jest.fn().mockResolvedValue('next');
  const result = session.run(async scope => {
    scope.onClose(close);
    return scope.step(() => request.promise);
  });
  const rejected = result.catch(error => error);
  await flush();
  timeout();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_TIMEOUT'});
  await expect(session.run(next)).rejects.toMatchObject({code: 'NFC_BUSY'});
  expect(next).not.toHaveBeenCalled();
  request.resolve('too late');
  await flush();
  expect(close).toHaveBeenCalledTimes(1);
  await expect(session.run(next)).resolves.toBe('next');
});

test('cleanup also holds ownership when native work has already finished', async () => {
  const cleanup = deferred<void>();
  const result = session.run(async scope => {
    scope.onClose(() => cleanup.promise);
    return 42;
  });
  await flush();
  await expect(session.run(async () => 1)).rejects.toMatchObject({
    code: 'NFC_BUSY',
  });
  cleanup.resolve();
  await expect(result).resolves.toBe(42);
  expect(stop).toHaveBeenCalled();
});

test('cancelling before work starts prevents all native calls', async () => {
  const job = jest.fn();
  const result = session.run(job);
  const rejected = result.catch(error => error);
  await session.cancel();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  expect(job).not.toHaveBeenCalled();
});

test('failure and repeated cancellation close exactly once and allow a new session', async () => {
  const request = deferred<void>();
  const close = jest.fn().mockResolvedValue(undefined);
  const result = session.run(async scope => {
    scope.onClose(close);
    await scope.step(() => request.promise);
    throw new Error('must not execute');
  });
  const rejected = result.catch(error => error);
  await flush();
  await session.cancel();
  await session.cancel();
  request.resolve();
  await expect(rejected).resolves.toMatchObject({code: 'NFC_CANCELLED'});
  await flush();
  expect(close).toHaveBeenCalledTimes(1);
  await expect(session.run(async () => 'next')).resolves.toBe('next');
});

test('job failure still cleans the resource and is not replaced by cleanup failure', async () => {
  const close = jest.fn().mockRejectedValue(new Error('cleanup'));
  await expect(
    session.run(async scope => {
      scope.onClose(close);
      throw new Error('original failure');
    }),
  ).rejects.toThrow('original failure');
  expect(close).toHaveBeenCalledTimes(1);
});
