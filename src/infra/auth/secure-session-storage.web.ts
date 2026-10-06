import {Session, SessionStorage} from '../../domain/auth/types';

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
