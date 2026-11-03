import {
  captureContext,
  administrationContext,
} from '../src/appplication/auth/operation-context';
import type {AuthSnapshot} from '../src/appplication/auth/session-manager';
import type {Session} from '../src/domain/auth/session';

const now = () => Date.parse('2026-10-23T15:00:00Z');
const session: Session = {
  baseUrl: 'http://127.0.0.1:3000/api/v1',
  token: 'nfc_' + 'a'.repeat(43),
  expiresAt: '2026-10-23T16:00:00Z',
  user: {id: 'admin', login: 'admin', nome: 'Admin', perfil: 'ADMINISTRADOR'},
};

test('capture capabilities retain owner/API and distinguish offline capture from sending', () => {
  expect(captureContext({status: 'anonymous'}, now())).toBeNull();
  expect(captureContext({status: 'checking', session}, now())).toBeNull();
  expect(captureContext({status: 'authenticated', session}, now())).toEqual({
    baseUrl: session.baseUrl,
    userId: session.user.id,
    canCapture: true,
    canSend: true,
  });
  expect(
    captureContext(
      {
        status: 'offline',
        session,
        previouslyVerified: true,
        message: 'offline',
      },
      now(),
    ),
  ).toEqual({
    baseUrl: session.baseUrl,
    userId: session.user.id,
    canCapture: true,
    canSend: false,
  });
  expect(
    captureContext(
      {
        status: 'authenticated',
        session: {...session, user: {...session.user, perfil: 'CONSULTA'}},
      },
      now(),
    )?.canCapture,
  ).toBe(false);
  expect(
    captureContext(
      {
        status: 'authenticated',
        session: {...session, expiresAt: new Date(now()).toISOString()},
      },
      now(),
    )?.canSend,
  ).toBe(false);
});

test('administration context is fenced if login changes during station lookup or marker calculation', async () => {
  let state: AuthSnapshot = {status: 'authenticated', session};
  const snapshot = () => state;
  const marker = jest.fn(async () => 'marker');
  const station = jest.fn(async () => {
    state = {status: 'anonymous'};
    return 'device';
  });
  await expect(
    administrationContext(snapshot, station, marker, now),
  ).rejects.toMatchObject({code: 'ADMIN_SESSAO_ALTERADA'});
  state = {status: 'authenticated', session};
  marker.mockImplementation(async () => {
    state = {
      status: 'authenticated',
      session: {...session, token: 'different-login'},
    };
    return 'marker';
  });
  await expect(
    administrationContext(snapshot, async () => 'device', marker, now),
  ).rejects.toMatchObject({code: 'ADMIN_SESSAO_ALTERADA'});
});

test('only authenticated, unexpired administrators obtain a physical operation context', async () => {
  const marker = jest.fn(async () => 'marker');
  const station = jest.fn(async () => 'device');
  const states: AuthSnapshot[] = [
    {status: 'anonymous'},
    {status: 'offline', session, previouslyVerified: true, message: 'offline'},
    {
      status: 'authenticated',
      session: {...session, user: {...session.user, perfil: 'OPERADOR'}},
    },
    {
      status: 'authenticated',
      session: {...session, expiresAt: new Date(now()).toISOString()},
    },
  ];
  for (const state of states)
    await expect(
      administrationContext(() => state, station, marker, now),
    ).rejects.toMatchObject({code: 'ADMIN_LOGIN_NECESSARIO'});
  expect(station).not.toHaveBeenCalled();
  expect(marker).not.toHaveBeenCalled();
  await expect(
    administrationContext(
      () => ({status: 'authenticated', session}),
      station,
      marker,
      now,
    ),
  ).resolves.toEqual({
    baseUrl: session.baseUrl,
    userId: session.user.id,
    station: 'device',
    sessionMarker: 'marker',
  });
  expect(marker).toHaveBeenCalledWith(session.token);
});
