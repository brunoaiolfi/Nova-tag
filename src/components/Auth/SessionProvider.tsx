import {showCommandFailure} from '../Base/Toast/service';
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import {AppState} from 'react-native';
import {SessionManager} from '../../appplication/auth/session-manager';

const Context = createContext<SessionManager | null>(null);
export function SessionProvider({
  children,
  manager,
}: PropsWithChildren<{manager: SessionManager}>) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  useEffect(() => {
    manager.restore().catch(showCommandFailure);
    let backgrounded = AppState.currentState === 'background';
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') {
        backgrounded = true;
      }
      if (next === 'active') {
        // Native NFC sheets briefly make iOS inactive; they are not a new session.
        if (backgrounded) {
          backgrounded = false;
          manager.restore().catch(showCommandFailure);
        } else {
          manager.expireIfNeeded().catch(showCommandFailure);
        }
      }
    });
    return () => subscription.remove();
  }, [manager]);
  useEffect(() => {
    if (state.status !== 'authenticated' && state.status !== 'offline') {
      return;
    }
    // JS timers use a signed 32-bit delay. Recheck long sessions in bounded
    // steps so an overflow cannot turn a future expiration into a 1 ms timer.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expiresAt = Date.parse(state.session.expiresAt);
    function checkExpiration() {
      const remainingMilliseconds = expiresAt - Date.now();
      if (remainingMilliseconds <= 0) {
        manager.expireIfNeeded().catch(showCommandFailure);
        return;
      }
      timer = setTimeout(
        checkExpiration,
        Math.min(remainingMilliseconds, 2147483647),
      );
    }
    checkExpiration();
    return () => clearTimeout(timer);
  }, [manager, state]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useSession() {
  const manager = useContext(Context);
  if (!manager)
    throw new Error('SessionProvider é necessário para este fluxo.');
  return {
    manager,
    state: useSyncExternalStore(manager.subscribe, manager.getSnapshot),
  };
}
