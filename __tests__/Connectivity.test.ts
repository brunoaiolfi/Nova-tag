import * as Network from 'expo-network';
import {connectivity} from '../src/infra/network/connectivity';

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => jest.clearAllMocks());

test('disposing before the lazy SDK resolves never registers a network listener', async () => {
  const online = jest.fn();
  const dispose = connectivity.subscribeWhenOnline(online);
  dispose();
  await settle();
  expect(Network.addNetworkStateListener).not.toHaveBeenCalled();
  expect(online).not.toHaveBeenCalled();
});

test('network adapter emits online only for connected/reachable state and removes the subscription', async () => {
  const online = jest.fn();
  const remove = jest.fn();
  let update!: Parameters<typeof Network.addNetworkStateListener>[0];
  jest.mocked(Network.addNetworkStateListener).mockImplementation(listener => {
    update = listener;
    return {remove};
  });
  const dispose = connectivity.subscribeWhenOnline(online);
  await settle();
  update({isConnected: false, isInternetReachable: true});
  update({isConnected: true, isInternetReachable: false});
  expect(online).not.toHaveBeenCalled();
  update({isConnected: true, isInternetReachable: true});
  expect(online).toHaveBeenCalledTimes(1);
  dispose();
  dispose();
  update({isConnected: true, isInternetReachable: true});
  expect(remove).toHaveBeenCalledTimes(1);
  expect(online).toHaveBeenCalledTimes(1);
});
