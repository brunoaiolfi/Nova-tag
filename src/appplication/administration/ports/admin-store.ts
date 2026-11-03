import type {AdminOwner} from '../../../domain/administration/owner';
import type {AdminOperation} from '../../../domain/administration/operation';
import type {AdminCommand} from '../../../domain/nfc/administrative-command.types';
import type {AdminReply} from '../contracts/admin-reply.types';
import type {AdminRfSession} from '../recovery.types';
import type {LocalCommand} from '../recovery.types';
import type {AdminDraft} from '../recovery.types';
import type {AdminActivation} from '../recovery.types';
import type {Provisioning} from '../../../domain/traceability/provisioning';

export interface AdminStore {
  draft(provisioningId: string, owner: AdminOwner): Promise<AdminDraft | null>;
  saveDraft(draft: AdminDraft): Promise<void>;
  saveOperation(operation: AdminOperation, owner: AdminOwner): Promise<void>;
  operation(id: string, owner: AdminOwner): Promise<AdminOperation | null>;
  saveSession(session: AdminRfSession): Promise<void>;
  sessions(operationId: string, owner: AdminOwner): Promise<AdminRfSession[]>;
  saveReply(session: AdminRfSession, reply: AdminReply): Promise<void>;
  attempt(session: AdminRfSession, command: AdminCommand): Promise<void>;
  response(
    session: AdminRfSession,
    command: AdminCommand,
    hex: string,
  ): Promise<void>;
  acknowledge(
    session: AdminRfSession,
    command: AdminCommand,
    reply: AdminReply,
  ): Promise<void>;
  commands(sessionId: string, owner: AdminOwner): Promise<LocalCommand[]>;
  endSession(sessionId: string, owner: AdminOwner): Promise<void>;
  activation(
    operationId: string,
    owner: AdminOwner,
  ): Promise<AdminActivation | null>;
  saveActivation(value: AdminActivation): Promise<void>;
  completeActivation(
    operationId: string,
    owner: AdminOwner,
    receipt: Provisioning,
  ): Promise<void>;
  rejectActivation(
    operationId: string,
    owner: AdminOwner,
    code: string,
  ): Promise<void>;
}
