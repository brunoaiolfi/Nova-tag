import * as Keychain from 'react-native-keychain';
import {
  isSession,
  Session,
  SessionError,
  SessionStorage,
} from '../../domain/auth/types';

const options = {service: 'com.novatag.auth.session'};
export class SecureSessionStorage implements SessionStorage {
  async load(): Promise<Session | null> {
    const credentials = await Keychain.getGenericPassword(options);
    if (!credentials) {
      return null;
    }
    let value: unknown;
    try {
      value = JSON.parse(credentials.password);
    } catch {
      throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
    }
    if (!isSession(value)) {
      throw new SessionError('SESSAO_INVALIDA', 'Entre novamente.', 401);
    }
    return value;
  }
  async save(session: Session) {
    const saved = await Keychain.setGenericPassword(
      session.user.id,
      JSON.stringify(session),
      options,
    );
    if (!saved) {
      throw new Error('Secure session storage unavailable');
    }
  }
  async clear() {
    await Keychain.resetGenericPassword(options);
  }
}
