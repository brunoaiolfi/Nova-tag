import {useCallback, useSyncExternalStore} from 'react';
import type {SessionManager} from '../../appplication/auth/session-manager';

/** In-memory identity fence only; never render, log or persist this key. */
export function useSessionScope(manager: SessionManager): string {
  const getScope = useCallback(() => {
    const snapshot = manager.getSnapshot();
    const identity = snapshot.session;
    return identity
      ? JSON.stringify([identity.baseUrl, identity.user.id, identity.token])
      : snapshot.status;
  }, [manager]);
  return useSyncExternalStore(manager.subscribe, getScope);
}
