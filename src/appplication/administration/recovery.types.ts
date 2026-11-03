import type {Material} from '../../domain/administration/operation';
import type {AdminOwner} from '../../domain/administration/owner';
import type {AdminCommand} from '../../domain/nfc/administrative-command.types';
import type {AdminReply} from './contracts/admin-reply.types';
import type {Reading} from '../../domain/traceability/reading';
import type {Provisioning} from '../../domain/traceability/provisioning';

export interface AdminRfSession {
  id: string;
  operationId: string;
  owner: AdminOwner;
  rfId: string;
  sessionMarker: string;
  station: string;
  recovery: boolean;
  materials: Material[];
  reply: AdminReply | null;
  ended: boolean;
}

export interface LocalCommand {
  sessionId: string;
  frame: AdminCommand;
  state: 'READY' | 'ATTEMPTED' | 'RESPONSE' | 'ACKNOWLEDGED';
  responseHex: string | null;
  receipt: AdminReply | null;
}

export interface AdminDraft {
  id: string;
  provisioningId: string;
  owner: AdminOwner;
  station: string;
}

export interface AdminActivation {
  operationId: string;
  owner: AdminOwner;
  reading: Reading;
  capturedAt: string;
  receipt: Provisioning | null;
}
