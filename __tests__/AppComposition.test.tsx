import {requiredItem} from '../test-support/required-item';
import React from 'react';
import {View, Pressable, Text, AppState} from 'react-native';
import {
  render as renderProbe,
  act,
  screen,
  userEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {createAppServices} from '../src/bootstrap/create-app-services';
import {
  AppServicesProvider,
  useAppServices,
} from '../src/components/Services/AppServicesProvider';
import {OfflineProvider} from '../src/components/Offline/OfflineProvider';
import {createTestServices} from '../test-support/app-services';
import type {Session} from '../src/domain/auth/session';
import type {Transport} from '../src/appplication/auth/ports/transport';
import type {AuthSnapshot} from '../src/appplication/auth/session-manager';

const now = () => Date.parse('2026-10-23T15:00:00Z');
const user = {
  id: 'operator',
  login: 'operator',
  nome: 'Operador',
  perfil: 'OPERADOR' as const,
};
const session: Session = {
  baseUrl: 'http://127.0.0.1:3000/api/v1',
  token: 'nfc_' + 'a'.repeat(43),
  user,
  expiresAt: '2026-10-23T16:00:00Z',
};

test('separate app graphs keep session, authenticated requests and storage in the same scope', async () => {
  function graph(id: string, baseUrl: string) {
    const storage = {
      load: jest.fn(async () => null),
      save: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };
    const send = jest.fn(async (_base: string, route: string) =>
      route === '/autenticacao/login'
        ? {
            tokenAcesso: session.token,
            expiraEm: session.expiresAt,
            usuario: {...user, id},
          }
        : {itens: [], total: 0},
    );
    const services = createAppServices({
      storage,
      transport: {send} as Transport,
      now,
      development: true,
      randomUUID: () => 'graph-id',
      installationId: async () => id,
    });
    return {services, storage, send, baseUrl};
  }
  const a = graph('a', 'http://127.0.0.1:3000/api/v1');
  const b = graph('b', 'http://127.0.0.1:4000/api/v1');
  expect(a.services.session).not.toBe(b.services.session);
  expect(a.services.offline).not.toBe(b.services.offline);
  expect(a.services.administration).not.toBe(b.services.administration);
  // Physical exclusivity is deliberately shared by the native adapter, not recreated per UI.
  expect(a.services.nfc.readPhysicalTag).toBe(b.services.nfc.readPhysicalTag);
  expect(a.send).not.toHaveBeenCalled();
  await a.services.session.login(a.baseUrl, 'operator', 'password');
  await a.services.traceability.listOrders('box');
  expect(b.send).not.toHaveBeenCalled();
  expect(b.storage.save).not.toHaveBeenCalled();
  expect(b.services.session.getSnapshot().status).toBe('checking');
  await b.services.session.login(b.baseUrl, 'operator', 'password');
  await b.services.traceability.listOrders('other');
  expect(a.send).toHaveBeenLastCalledWith(
    a.baseUrl,
    expect.stringContaining('/pedidos?'),
    expect.objectContaining({token: session.token}),
  );
  expect(b.send).toHaveBeenLastCalledWith(
    b.baseUrl,
    expect.stringContaining('/pedidos?'),
    expect.objectContaining({token: session.token}),
  );
  expect(a.storage.save).toHaveBeenCalledWith(
    expect.objectContaining({
      baseUrl: a.baseUrl,
      user: expect.objectContaining({id: 'a'}),
    }),
  );
  expect(b.storage.save).toHaveBeenCalledWith(
    expect.objectContaining({
      baseUrl: b.baseUrl,
      user: expect.objectContaining({id: 'b'}),
    }),
  );
});

test('presentation uses its provider graph instead of an ambient singleton', async () => {
  const listA = jest.fn().mockResolvedValue({itens: [], total: 0});
  const listB = jest.fn().mockResolvedValue({itens: [], total: 0});
  const a = createTestServices({traceability: {listOrders: listA}});
  const b = createTestServices({traceability: {listOrders: listB}});
  const reportFailure = jest.fn();
  function ServiceAction({name, run}: {name: string; run(): void}) {
    return (
      <Pressable accessibilityRole="button" onPress={run}>
        <Text>{name}</Text>
      </Pressable>
    );
  }
  function Probe({name}: {name: string}) {
    const services = useAppServices();
    return (
      <ServiceAction
        name={name}
        run={() => {
          services.traceability.listOrders(name).catch(reportFailure);
        }}
      />
    );
  }
  let tree!: RenderResult;
  tree = await renderProbe(
    <View>
      <AppServicesProvider services={a}>
        <Probe name="a" />
      </AppServicesProvider>
      <AppServicesProvider services={b}>
        <Probe name="b" />
      </AppServicesProvider>
    </View>,
  );
  try {
    await userEvent.press(screen.getByRole('button', {name: 'a'}));

    expect(listA).toHaveBeenCalledWith('a');
    expect(listB).not.toHaveBeenCalled();

    await userEvent.press(screen.getByRole('button', {name: 'b'}));

    expect(listB).toHaveBeenCalledWith('b');
    expect(listA).toHaveBeenCalledTimes(1);
    expect(reportFailure).not.toHaveBeenCalled();
  } finally {
    await tree.unmount();
  }
});

test('offline lifecycle uses the injected network monitor, resumes the same queue and disposes timers/listeners', async () => {
  jest.useFakeTimers();
  const auth: AuthSnapshot = {status: 'authenticated', session};
  const refresh = jest.fn().mockResolvedValue(undefined);
  const synchronize = jest.fn().mockResolvedValue(undefined);
  const refreshDecisions = jest.fn().mockResolvedValue(undefined);
  const flush = jest.fn().mockResolvedValue(undefined);
  const services = createTestServices({
    session: {getSnapshot: () => auth},
    offline: {refresh, synchronize, refreshDecisions},
    experiment: {flush},
  });
  let online!: () => void;
  const stop = jest.fn();
  const connectivity = {
    subscribeWhenOnline: jest.fn((callback: () => void) => {
      online = callback;
      return stop;
    }),
  };
  let tree!: RenderResult;
  try {
    tree = await renderProbe(
      <OfflineProvider
        manager={services.offline}
        session={services.session}
        connectivity={connectivity}>
        <View />
      </OfflineProvider>,
    );
    expect(refresh).toHaveBeenCalled();
    expect(synchronize).toHaveBeenCalledWith(true);
    expect(flush).toHaveBeenCalled();
    synchronize.mockClear();
    await act(async () => {
      online();
    });
    expect(synchronize).toHaveBeenCalledWith(true);
    synchronize.mockClear();
    await act(async () => {
      await tree.unmount();
    });
    expect(stop).toHaveBeenCalledTimes(1);
    await act(async () => {
      online();
      await jest.advanceTimersByTimeAsync(15000);
    });
    expect(synchronize).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    if (tree) await tree.unmount();
    jest.useRealTimers();
  }
});

test('Expo architecture remains free of grandfathered dependencies', () => {
  const exceptions: unknown = require('../scripts/architecture/exceptions.json');
  expect(exceptions).toEqual([]);
});

test.each(['online', 'resume', 'timer'] as const)(
  '%s background rejection is owned and does not prevent independent journal upload',
  async reason => {
    jest.useFakeTimers();
    const scheduleInterval = jest.spyOn(global, 'setInterval');
    const clearInterval = jest.spyOn(global, 'clearInterval');
    const failure = new Error('background unavailable');
    const reportBackgroundFailure = jest.fn();
    const synchronize = jest.fn().mockResolvedValue(undefined);
    const refreshDecisions = jest.fn().mockResolvedValue(undefined);
    const flush = jest.fn().mockResolvedValue(undefined);
    const services = createTestServices({
      session: {
        getSnapshot: () => ({status: 'authenticated', session} as AuthSnapshot),
      },
      offline: {
        refresh: jest.fn().mockResolvedValue(undefined),
        synchronize,
        refreshDecisions,
        reportBackgroundFailure,
      },
      experiment: {flush},
    });
    // Keep this external-store snapshot stable while its value has not changed.
    const auth: AuthSnapshot = {status: 'authenticated', session};
    services.session.getSnapshot = () => auth;
    let online!: () => void;
    let appState!: (state: 'active') => void;
    const stop = jest.fn();
    mockAppStateDescriptor = Object.getOwnPropertyDescriptor(
      AppState,
      'currentState',
    );
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'active',
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appState = listener;
        return {remove: jest.fn()};
      });
    const connectivity = {
      subscribeWhenOnline: jest.fn((listener: () => void) => {
        online = listener;
        return stop;
      }),
    };
    const view = await renderProbe(
      <OfflineProvider
        manager={services.offline}
        session={services.session}
        connectivity={connectivity}>
        <View />
      </OfflineProvider>,
    );
    refreshDecisions.mockRejectedValueOnce(failure);
    flush.mockClear();
    await act(async () => {
      if (reason === 'online') online();
      else if (reason === 'resume') appState('active');
      else await jest.advanceTimersByTimeAsync(15000);
    });
    expect(reportBackgroundFailure).toHaveBeenCalledWith(failure, {
      userId: session.user.id,
      baseUrl: session.baseUrl,
    });
    expect(flush).toHaveBeenCalledTimes(1);
    const intervalIndex = scheduleInterval.mock.calls.findIndex(
      ([, delay]) => delay === 15000,
    );
    const interval = requiredItem(
      scheduleInterval.mock.results,
      intervalIndex,
    ).value;
    await view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(clearInterval).toHaveBeenCalledWith(interval);
    synchronize.mockClear();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(15000);
    });
    expect(synchronize).not.toHaveBeenCalled();
    jest.restoreAllMocks();
    jest.useRealTimers();
  },
);

test('background notifications read the new identity without reconnecting the monitor or reporting an old login failure', async () => {
  let auth: AuthSnapshot = {status: 'authenticated', session};
  const reportBackgroundFailure = jest.fn();
  const synchronize = jest.fn().mockResolvedValue(undefined);
  const services = createTestServices({
    session: {getSnapshot: () => auth},
    offline: {
      refresh: jest.fn().mockResolvedValue(undefined),
      synchronize,
      refreshDecisions: jest.fn().mockResolvedValue(undefined),
      reportBackgroundFailure,
    },
    experiment: {flush: jest.fn().mockResolvedValue(undefined)},
  });
  let online!: () => void;
  const connectivity = {
    subscribeWhenOnline: jest.fn((listener: () => void) => {
      online = listener;
      return jest.fn();
    }),
  };
  const element = () => (
    <OfflineProvider
      manager={services.offline}
      session={services.session}
      connectivity={connectivity}>
      <View />
    </OfflineProvider>
  );
  const view = await renderProbe(element());
  let reject!: (error: Error) => void;
  synchronize.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await act(async () => online());
  auth = {
    status: 'authenticated',
    session: {...session, token: 'nfc_' + 'b'.repeat(43)},
  };
  await view.rerender(element());
  await act(async () => reject(new Error('failure from previous login')));
  expect(connectivity.subscribeWhenOnline).toHaveBeenCalledTimes(1);
  expect(reportBackgroundFailure).not.toHaveBeenCalled();
});

let mockAppStateDescriptor: PropertyDescriptor | undefined;
afterEach(() => {
  if (mockAppStateDescriptor)
    Object.defineProperty(AppState, 'currentState', mockAppStateDescriptor);
  mockAppStateDescriptor = undefined;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
