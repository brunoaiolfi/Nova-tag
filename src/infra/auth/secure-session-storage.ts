import * as SecureStore from 'expo-secure-store';
import {
  isSession,
  Session,
  SessionError,
  SessionStorage,
} from '../../domain/auth/types';

const key = 'com.novatag.preview.auth.session';
export class SecureSessionStorage implements SessionStorage {
  async load(): Promise<Session | null> {
    const credentials = await SecureStore.getItemAsync(key);
    if (!credentials) {
      return null;
    }
    let value: unknown;
    try {
      value = JSON.parse(credentials);
    } catch {
      throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
    }
    if (!isSession(value)) {
      throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
    }
    return value;
  }
  async save(session: Session) {
    await SecureStore.setItemAsync(key, JSON.stringify(session));
  }
  async clear() {
    await SecureStore.deleteItemAsync(key);
  }
}
