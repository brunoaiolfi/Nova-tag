import {Session} from '../../domain/auth/session';
import {SessionStorage} from '../../appplication/auth/ports/session-storage';

// A prévia web não persiste tokens em armazenamento acessível a scripts.
export class SecureSessionStorage implements SessionStorage {
  private session: Session | null = null;
  async load() {
    return this.session;
  }
  async save(session: Session) {
    this.session = session;
  }
  async clear() {
    this.session = null;
  }
}
