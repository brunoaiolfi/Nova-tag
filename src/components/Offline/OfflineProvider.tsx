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
import type {Connectivity} from '../../appplication/ports/app-services';

const Context = createContext<OfflineCoordinator | null>(null);
export function OfflineProvider({
  children,
  manager,
  session,
  connectivity,
}: PropsWithChildren<{
  manager: OfflineCoordinator;
  session: SessionManager;
  connectivity: Connectivity;
}>) {
  const auth = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    void manager.refresh();
    if (auth.status === 'authenticated')
      void manager
        .synchronize(true)
        .then(() => manager.refreshDecisions())
        .then(() => manager.experiment?.flush())
        .catch(() => {});
  }, [auth, manager]);
  useEffect(() => {
    let disposed = false;
    const appState = AppState;
    const resume = async () => {
      if (disposed) return;
      const state = session.getSnapshot();
      if (state.status === 'offline' || state.status === 'unavailable')
        await session.restore();
      if (!disposed) {
        await manager.synchronize(true);
        await manager.refreshDecisions().catch(() => {});
        await manager.experiment?.flush().catch(() => {});
      }
    };
    const stopNetwork = connectivity.subscribeWhenOnline(() => {
      void resume();
    });
    const subscription = appState.addEventListener('change', state => {
      if (state === 'active') void resume();
    });
    const timer = setInterval(() => {
      if (!disposed && appState.currentState === 'active')
        void manager
          .synchronize()
          .then(() => manager.refreshDecisions())
          .then(() => manager.experiment?.flush())
          .catch(() => {});
    }, 15000);
    return () => {
      disposed = true;
      stopNetwork();
      subscription.remove();
      clearInterval(timer);
    };
  }, [manager, session, connectivity]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useOffline() {
  const manager = useContext(Context);
  if (!manager)
    throw new Error('OfflineProvider é necessário para este fluxo.');
  return {
    manager,
    ...useSyncExternalStore(manager.subscribe, manager.getSnapshot),
  };
}
