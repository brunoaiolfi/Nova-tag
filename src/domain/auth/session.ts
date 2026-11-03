import type {User} from './user';

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
  baseUrl: string;
  verifiedAt?: string;
}
