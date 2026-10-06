import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import {AppState} from 'react-native';
import {OfflineCoordinator} from '../../appplication/offline/coordinator';
import {SessionManager} from '../../appplication/auth/session-manager';
import {offline} from '../../infra/offline/runtime';
import {sessionManager} from '../../infra/auth/runtime';

const Context = createContext<OfflineCoordinator>(offline);
export function OfflineProvider({
  children,
  manager = offline,
  session = sessionManager,
}: PropsWithChildren<{
  manager?: OfflineCoordinator;
  session?: SessionManager;
}>) {
  const auth = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    void manager.refresh();
    if (auth.status === 'authenticated') void manager.synchronize(true);
  }, [auth, manager]);
  useEffect(() => {
    let disposed = false;
    let network: {remove(): void} | undefined;
    const appState = AppState;
    const resume = async () => {
      if (disposed) return;
      const state = session.getSnapshot();
      if (state.status === 'offline' || state.status === 'unavailable')
        await session.restore();
      if (!disposed) {
        await manager.synchronize(true);
        await manager.refreshDecisions().catch(() => {});
      }
    };
    void Promise.resolve()
      .then(() => require('expo-network') as typeof import('expo-network'))
      .then(module => {
        if (!disposed)
          network = module.addNetworkStateListener(state => {
            if (state.isConnected && state.isInternetReachable !== false)
              void resume();
          });
      })
      .catch(() => {});
    const subscription = appState.addEventListener('change', state => {
      if (state === 'active') void resume();
    });
    const timer = setInterval(() => {
      if (!disposed && appState.currentState === 'active')
        void manager.synchronize();
    }, 15000);
    return () => {
      disposed = true;
      network?.remove();
      subscription.remove();
      clearInterval(timer);
    };
  }, [manager, session]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useOffline() {
  const manager = useContext(Context);
  return {
    manager,
    ...useSyncExternalStore(manager.subscribe, manager.getSnapshot),
  };
}
