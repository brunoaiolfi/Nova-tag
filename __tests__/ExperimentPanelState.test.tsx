import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {createTestServices, withServices} from '../test-support/app-services';
import {useExperimentPanel} from '../src/components/Offline/use-experiment-panel';
import type {AuthSnapshot} from '../src/appplication/auth/session-manager';
import type {Session} from '../src/domain/auth/session';
import type {ExperimentRun} from '../src/appplication/experimentation/catalog.types';

let mockAuth: AuthSnapshot;
const mockSelection = {plan: null, hold: false, pending: 0, sent: 0, failed: 0};
const mockExperiment = {
  state: jest.fn(),
  select: jest.fn(),
  release: jest.fn(),
  flush: jest.fn(),
};
const mockQueue = {
  manager: {
    experiment: mockExperiment,
    synchronize: jest.fn(),
    refreshDecisions: jest.fn(),
  },
  items: [],
  syncing: false,
};
jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({state: mockAuth}),
}));
jest.mock('../src/components/Offline/OfflineProvider', () => ({
  useOffline: () => mockQueue,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) =>
    require('react').useEffect(callback, [callback]),
}));
const session = (id: string): Session => ({
  token: `token-${id}`,
  baseUrl: 'https://api.example/api/v1',
  user: {id, login: id, nome: id, perfil: 'OPERADOR'},
  expiresAt: '2030-01-01T00:00:00Z',
});
const run: ExperimentRun = {
  id: 'run',
  name: 'Ensaio',
  dataKind: 'FISICO',
  configuration: {timeoutMs: 1000},
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return {promise, resolve};
}
let panel: ReturnType<typeof useExperimentPanel>;
let tree: TestRenderer.ReactTestRenderer;
function Probe() {
  panel = useExperimentPanel();
  return null;
}
const services = createTestServices({
  session: {getSnapshot: () => mockAuth},
  installationId: async () => 'phone',
});
const render = () => withServices(<Probe />, services);
beforeEach(() => {
  mockAuth = {status: 'authenticated', session: session('A')};
  mockExperiment.state.mockResolvedValue(mockSelection);
  jest.spyOn(services.experimentCatalog, 'runs');
  jest.spyOn(services.experimentCatalog, 'plans');
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('a query response from account A never appears for account B', async () => {
  const response = deferred<{
    items: ExperimentRun[];
    page: number;
    total: number;
  }>();
  jest
    .mocked(services.experimentCatalog.runs)
    .mockReturnValueOnce(response.promise);
  await act(async () => {
    tree = TestRenderer.create(render());
  });
  let query!: Promise<void>;
  await act(async () => {
    query = panel.loadRuns();
  });
  mockAuth = {status: 'authenticated', session: session('B')};
  await act(async () => tree.update(render()));
  await act(async () => {
    response.resolve({items: [run], page: 1, total: 1});
    await query;
  });
  expect(panel.runs).toEqual([]);
  expect(panel.busy).toBe(false);
});
test('the latest requested plan page wins when replies arrive out of order', async () => {
  const oldPage = deferred<{items: []; page: number; total: number}>();
  jest
    .mocked(services.experimentCatalog.plans)
    .mockReturnValueOnce(oldPage.promise)
    .mockResolvedValueOnce({items: [], page: 2, total: 40});
  await act(async () => {
    tree = TestRenderer.create(render());
  });
  let oldQuery!: Promise<void>;
  await act(async () => {
    oldQuery = panel.loadPlans(run, 1);
  });
  await act(async () => panel.loadPlans(run, 2));
  await act(async () => {
    oldPage.resolve({items: [], page: 1, total: 20});
    await oldQuery;
  });
  expect(panel.page).toBe(2);
  expect(panel.total).toBe(40);
});
test('unmount prevents a late query from refreshing or issuing another command', async () => {
  const response = deferred<{
    items: ExperimentRun[];
    page: number;
    total: number;
  }>();
  jest
    .mocked(services.experimentCatalog.runs)
    .mockReturnValueOnce(response.promise);
  await act(async () => {
    tree = TestRenderer.create(render());
  });
  let query!: Promise<void>;
  await act(async () => {
    query = panel.loadRuns();
  });
  await act(async () => tree.unmount());
  const refreshes = mockExperiment.state.mock.calls.length;
  await act(async () => {
    response.resolve({items: [run], page: 1, total: 1});
    await query;
  });
  expect(mockExperiment.state).toHaveBeenCalledTimes(refreshes);
  expect(mockExperiment.select).not.toHaveBeenCalled();
});
test('experimental mutations have a synchronous exclusion guard', async () => {
  const completion = deferred<void>();
  mockExperiment.select.mockReturnValueOnce(completion.promise);
  await act(async () => {
    tree = TestRenderer.create(render());
  });
  let first!: Promise<void>;
  await act(async () => {
    first = panel.select(null);
    void panel.select(null);
  });
  expect(mockExperiment.select).toHaveBeenCalledTimes(1);
  await act(async () => {
    completion.resolve();
    await first;
  });
  expect(panel.busy).toBe(false);
});
test('changing account during release prevents follow-up synchronization under another identity', async () => {
  const completion = deferred<void>();
  mockExperiment.release.mockReturnValueOnce(completion.promise);
  await act(async () => {
    tree = TestRenderer.create(render());
  });
  let release!: Promise<void>;
  await act(async () => {
    release = panel.release();
  });
  mockAuth = {status: 'authenticated', session: session('B')};
  await act(async () => tree.update(render()));
  await act(async () => {
    completion.resolve();
    await release;
  });
  expect(mockQueue.manager.synchronize).not.toHaveBeenCalled();
  expect(mockExperiment.flush).not.toHaveBeenCalled();
});
