import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useEffectEvent,
  useSyncExternalStore,
} from 'react';
import {AppState} from 'react-native';
import {OfflineCoordinator} from '../../appplication/offline/coordinator';
import {SessionManager} from '../../appplication/auth/session-manager';
import type {Connectivity} from '../../appplication/ports/app-services';
import type {Session} from '../../domain/auth/session';
import {sameSessionIdentity} from '../../domain/auth/session-identity';

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
  // Notification policy reads the latest rendered identity, without rebuilding
  // the network/AppState subscriptions on every authentication snapshot change.
  const reportFailure = useEffectEvent(
    (error: unknown, originatingSession: Session | undefined) => {
      if (
        originatingSession &&
        sameSessionIdentity(originatingSession, auth.session)
      )
        manager.reportBackgroundFailure(error, {
          userId: originatingSession.user.id,
          baseUrl: originatingSession.baseUrl,
        });
    },
  );
  useEffect(() => {
    let disposed = false;
    const identity = auth.session;
    manager
      .refresh()
      .then(async () => {
        if (!disposed && auth.status === 'authenticated') {
          await manager.synchronize(true);
          if (disposed) return;
          await manager.refreshDecisions().catch(error => {
            if (!disposed) reportFailure(error, identity);
          });
          if (!disposed) await manager.experiment?.flush();
        }
      })
      .catch(error => {
        if (!disposed) reportFailure(error, identity);
      });
    return () => {
      disposed = true;
    };
  }, [auth, manager]);
  useEffect(() => {
    let disposed = false;
    const resume = (force: boolean) => {
      if (disposed) return;
      const state = session.getSnapshot();
      const identity = state.session;
      const ready =
        state.status === 'offline' || state.status === 'unavailable'
          ? session.restore()
          : Promise.resolve();
      ready
        .then(async () => {
          if (disposed) return;
          await manager.synchronize(force);
          if (disposed) return;
          await manager.refreshDecisions().catch(error => {
            if (!disposed) reportFailure(error, identity);
          });
          if (!disposed) await manager.experiment?.flush();
        })
        .catch(error => {
          if (!disposed) reportFailure(error, identity);
        });
    };
    const stopNetwork = connectivity.subscribeWhenOnline(() => resume(true));
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') resume(true);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') resume(false);
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
