import {createTestServices, withServices} from '../test-support/app-services';

import React from 'react';
import {AppState} from 'react-native';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
  userEvent,
} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {SessionProvider} from '../src/components/Auth/SessionProvider';
import {SessionGate} from '../src/components/Auth/SessionGate';
import Leitor from '../src/components/Nfc/Leitor';
import {SessionManager} from '../src/appplication/auth/session-manager';
import {Session} from '../src/domain/auth/session';
import {SessionError} from '../src/appplication/auth/session-error';
import {Transport} from '../src/appplication/auth/ports/transport';
import {readPhysicalTag} from '../src/infra/nfc/reader';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  readPhysicalTag: jest.fn(),
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
const services = createTestServices({});

const session: Session = {
  baseUrl: 'http://127.0.0.1:3000/api/v1',
  token: 'nfc_' + 'a'.repeat(43),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  user: {
    id: 'operator',
    nome: 'Operador',
    login: 'operator',
    perfil: 'OPERADOR',
  },
};
const verification = {usuario: session.user, expiraEm: session.expiresAt};
let change: Parameters<typeof AppState.addEventListener>[1];
const button = (label: string) => screen.getByRole('button', {name: label});

async function render(
  send = jest.fn().mockResolvedValue(verification),
  now: () => number = Date.now,
) {
  const listeners = new Set<Parameters<typeof AppState.addEventListener>[1]>();
  change = next => listeners.forEach(listener => listener(next));
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      listeners.add(listener);
      return {remove: jest.fn(() => listeners.delete(listener))};
    });
  const onRead = jest.fn();
  const storage = {
    load: jest.fn().mockResolvedValue(session),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const manager = new SessionManager(storage, {send} as Transport, true, now);
  await renderProbe(
    withServices(
      <PaperProvider>
        <SessionProvider manager={manager}>
          <SessionGate>
            <Leitor onLeituraRealizada={onRead} onErroLeitura={jest.fn()} />
          </SessionGate>
        </SessionProvider>
      </PaperProvider>,
      services,
    ),
  );
  return {manager, send, storage, onRead};
}
async function scan() {
  jest.mocked(readPhysicalTag).mockResolvedValueOnce({uid: '53721F76950001'});

  await fireEvent.press(button('Ler etiqueta'));

  return screen.getByText('53:72:1F:76:95:00:01', {
    includeHiddenElements: true,
  });
}
afterEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('closing the iOS NFC sheet does not restore the session or erase a completed reading', async () => {
  const {send, manager} = await render();
  await act(async () => {
    change('inactive');
  });
  const details = await scan();
  await act(async () => {
    change('active');
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(
    screen.getByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).toBe(details);
  expect(details).toHaveTextContent('53:72:1F:76:95:00:01');
});

test('returning to active before NFC resolves still retains the reader and its result', async () => {
  const {send} = await render();
  let finish!: (reading: {uid: string}) => void;
  jest.mocked(readPhysicalTag).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );

  await fireEvent.press(button('Ler etiqueta'));
  await act(async () => {
    change('inactive');
    change('active');
  });

  await act(async () => {
    finish({uid: '53721F76950001'});
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByText('53:72:1F:76:95:00:01')).toBeVisible();
});

test('real background revalidation blocks interaction without unmounting the captured tag', async () => {
  const {send, manager, onRead} = await render();
  const details = await scan();
  let finish!: (value: typeof verification) => void;
  send.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await act(async () => {
    change('inactive');
    change('background');
    change('inactive');
    change('active');
  });
  expect(manager.getSnapshot().status).toBe('checking');
  expect(
    screen.getByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).toBe(details);
  expect(screen.queryByText('53:72:1F:76:95:00:01')).not.toBeOnTheScreen();
  await userEvent.press(
    screen.getByRole('button', {
      name: 'Continuar',
      includeHiddenElements: true,
    }),
  );
  expect(onRead).not.toHaveBeenCalled();
  await act(async () => {
    finish(verification);
  });
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(
    screen.getByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).toBe(details);
  expect(send).toHaveBeenCalledTimes(2);
});

test('network failure permits local work for a verified identity but blocks HTTP until reconnection', async () => {
  const {send, manager} = await render();
  const details = await scan();
  send.mockRejectedValueOnce(new SessionError('API_INDISPONIVEL', 'offline'));
  await act(async () => {
    change('background');
    change('active');
  });
  expect(manager.getSnapshot().status).toBe('offline');
  expect(
    screen.getByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).toBe(details);
  await expect(manager.request('/pedidos')).rejects.toMatchObject({
    code: 'SESSAO_OFFLINE',
    status: 503,
  });
  await act(async () => {
    await manager.restore();
  });
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(
    screen.getByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).toBe(details);
});

test('revoked sessions remove protected tag data despite preservation during revalidation', async () => {
  const {send, manager, storage} = await render();
  await scan();
  send.mockRejectedValueOnce(
    new SessionError('SESSAO_INVALIDA', 'revoked', 401),
  );
  await act(async () => {
    change('background');
    change('active');
  });
  expect(manager.getSnapshot().status).toBe('anonymous');
  expect(storage.clear).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole('button', {name: 'Ler etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).not.toBeOnTheScreen();
});

test('an unverified saved session never mounts the protected reader on cold startup', async () => {
  const send = jest
    .fn()
    .mockRejectedValue(new SessionError('API_INDISPONIVEL', 'offline'));
  const {manager} = await render(send);
  expect(manager.getSnapshot().status).toBe('unavailable');
  expect(
    screen.queryByRole('button', {name: 'Ler etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).not.toBeOnTheScreen();
});

test('a short native interruption still invalidates a session that has expired', async () => {
  let now = Date.now();
  const {manager, storage, send} = await render(undefined, () => now);
  await scan();
  now = Date.parse(session.expiresAt) + 1;
  await act(async () => {
    change('inactive');
    change('active');
  });
  expect(manager.getSnapshot().status).toBe('anonymous');
  expect(storage.clear).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole('button', {name: 'Ler etiqueta'}),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).not.toBeOnTheScreen();
  expect(send).toHaveBeenCalledTimes(1);
});

test('verification of a different operator resets the previous operator’s reading', async () => {
  const {manager, storage, send} = await render();
  await scan();
  const next = {...session, user: {...session.user, id: 'another-operator'}};
  storage.load.mockResolvedValueOnce(next);
  send.mockResolvedValueOnce({usuario: next.user, expiraEm: next.expiresAt});
  await act(async () => {
    change('background');
    change('active');
  });
  expect(manager.getSnapshot().session?.user.id).toBe(next.user.id);
  expect(
    screen.queryByText('53:72:1F:76:95:00:01', {includeHiddenElements: true}),
  ).not.toBeOnTheScreen();
});
