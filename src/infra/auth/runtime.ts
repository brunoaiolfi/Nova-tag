import {SessionManager} from '../../appplication/auth/session-manager';
import {HttpTransport} from './http-transport';
import {SecureSessionStorage} from './secure-session-storage';

export const sessionManager = new SessionManager(
  new SecureSessionStorage(),
  new HttpTransport(),
  __DEV__,
);
