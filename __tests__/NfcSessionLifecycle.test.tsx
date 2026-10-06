import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import {AppState} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider} from 'react-native-paper';
import {SessionProvider} from '../src/components/Auth/SessionProvider';
import {SessionGate} from '../src/components/Auth/SessionGate';
import Leitor from '../src/components/Nfc/Leitor';
import TagDetails from '../src/components/Nfc/TagDetails';
import {SessionManager} from '../src/appplication/auth/session-manager';
import {Session, SessionError, Transport} from '../src/domain/auth/types';
import {readPhysicalTag} from '../src/infra/nfc/reader';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  readPhysicalTag: jest.fn(),
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
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
let tree: TestRenderer.ReactTestRenderer;
let change: Parameters<typeof AppState.addEventListener>[1];
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;

async function render(
  send = jest.fn().mockResolvedValue(verification),
  now: () => number = Date.now,
) {
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      change = listener;
      return {remove: jest.fn()};
    });
  const storage = {
    load: jest.fn().mockResolvedValue(session),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const manager = new SessionManager(storage, {send} as Transport, true, now);
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <SessionProvider manager={manager}>
          <SessionGate>
            <Leitor onLeituraRealizada={jest.fn()} onErroLeitura={jest.fn()} />
          </SessionGate>
        </SessionProvider>
      </PaperProvider>,
    );
  });
  return {manager, send, storage};
}
async function scan() {
  jest.mocked(readPhysicalTag).mockResolvedValueOnce({uid: '53721F76950001'});
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  return tree.root.findByType(TagDetails);
}
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('closing the iOS NFC sheet does not restore the session or erase a completed reading', async () => {
  const {send, manager} = await render();
  const reader = tree.root.findByType(Leitor);
  await act(async () => {
    change('inactive');
  });
  const details = await scan();
  await act(async () => {
    change('active');
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(tree.root.findByType(Leitor)).toBe(reader);
  expect(tree.root.findByType(TagDetails)).toBe(details);
  expect(details.props.reading.uid).toBe('53721F76950001');
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
  const reader = tree.root.findByType(Leitor);
  await act(async () => {
    button('Ler etiqueta').props.onPress();
    change('inactive');
    change('active');
  });
  await act(async () => {
    finish({uid: '53721F76950001'});
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(Leitor)).toBe(reader);
  expect(tree.root.findByType(TagDetails).props.reading.uid).toBe(
    '53721F76950001',
  );
});

test('real background revalidation blocks interaction without unmounting the captured tag', async () => {
  const {send, manager} = await render();
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
  expect(tree.root.findByType(TagDetails)).toBe(details);
  expect(
    tree.root.findAll(
      node =>
        node.props.pointerEvents === 'none' &&
        node.props.accessibilityElementsHidden === true,
    ).length,
  ).toBeGreaterThan(0);
  await act(async () => {
    finish(verification);
  });
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(tree.root.findByType(TagDetails)).toBe(details);
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
  expect(tree.root.findByType(TagDetails)).toBe(details);
  await expect(manager.request('/pedidos')).rejects.toMatchObject({
    code: 'SESSAO_OFFLINE',
    status: 503,
  });
  await act(async () => {
    await manager.restore();
  });
  expect(manager.getSnapshot().status).toBe('authenticated');
  expect(tree.root.findByType(TagDetails)).toBe(details);
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
  expect(tree.root.findAllByType(Leitor)).toHaveLength(0);
});

test('an unverified saved session never mounts the protected reader on cold startup', async () => {
  const send = jest
    .fn()
    .mockRejectedValue(new SessionError('API_INDISPONIVEL', 'offline'));
  const {manager} = await render(send);
  expect(manager.getSnapshot().status).toBe('unavailable');
  expect(tree.root.findAllByType(Leitor)).toHaveLength(0);
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
  expect(tree.root.findAllByType(Leitor)).toHaveLength(0);
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
  expect(tree.root.findAllByType(TagDetails)).toHaveLength(0);
});
