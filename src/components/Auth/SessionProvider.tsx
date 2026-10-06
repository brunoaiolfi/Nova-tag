import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import {AppState} from 'react-native';
import {SessionManager} from '../../appplication/auth/session-manager';
import {sessionManager} from '../../infra/auth/runtime';

const Context = createContext<SessionManager>(sessionManager);
export function SessionProvider({
  children,
  manager = sessionManager,
}: PropsWithChildren<{manager?: SessionManager}>) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  useEffect(() => {
    void manager.restore();
    let backgrounded = AppState.currentState === 'background';
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') {
        backgrounded = true;
      }
      if (next === 'active') {
        // Native NFC sheets briefly make iOS inactive; they are not a new session.
        if (backgrounded) {
          backgrounded = false;
          void manager.restore();
        } else {
          void manager.expireIfNeeded();
        }
      }
    });
    return () => subscription.remove();
  }, [manager]);
  useEffect(() => {
    if (state.status !== 'authenticated' && state.status !== 'offline') {
      return;
    }
    const timer = setTimeout(() => {
      void manager.expireIfNeeded();
    }, Math.max(0, Date.parse(state.session.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [manager, state]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useSession() {
  const manager = useContext(Context);
  return {
    manager,
    state: useSyncExternalStore(manager.subscribe, manager.getSnapshot),
  };
}
