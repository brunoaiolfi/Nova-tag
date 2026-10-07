import {
  AdministrationError,
  AdminDraft,
  AdminOperation,
  AdminOwner,
  AdminReply,
  AdminRfSession,
  AdminStore,
  LocalCommand,
  AdminCommand,
  AdminActivation,
  assertOperation,
  assertReply,
} from '../../domain/administration/types';
import type {SqlConnection} from '../offline/sqlite-store';
import type {Provisioning} from '../../domain/traceability/types';
const fail = (message: string): never => {
  throw new AdministrationError('ADMIN_DIARIO_CONFLITANTE', message);
};
type OperationRow = {
  id: string;
  provisioning_id: string;
  base_url: string;
  user_id: string;
  station: string;
  plan_hash: string | null;
  snapshot: string | null;
};
type SessionRow = {
  id: string;
  operation_id: string;
  base_url: string;
  user_id: string;
  rf_id: string;
  station: string;
  session_marker: string;
  recovery: number;
  materials: string;
  reply: string | null;
  ended: number;
};
type CommandRow = {
  session_id: string;
  frame: string;
  state: LocalCommand['state'];
  response_hex: string | null;
  receipt: string | null;
};
const schema = `
 CREATE TABLE admin_operations(id TEXT PRIMARY KEY,provisioning_id TEXT NOT NULL,base_url TEXT NOT NULL,user_id TEXT NOT NULL,
 station TEXT NOT NULL,plan_hash TEXT,snapshot TEXT,UNIQUE(base_url,user_id,provisioning_id));
 CREATE TABLE admin_rf_sessions(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,operation_id TEXT NOT NULL REFERENCES admin_operations(id),
 base_url TEXT NOT NULL,user_id TEXT NOT NULL,rf_id TEXT UNIQUE NOT NULL,station TEXT NOT NULL,session_marker TEXT NOT NULL,
 recovery INTEGER NOT NULL,materials TEXT NOT NULL,reply TEXT,ended INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE admin_commands(command_id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES admin_rf_sessions(id),sequence INTEGER NOT NULL,
 frame TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('READY','ATTEMPTED','RESPONSE','ACKNOWLEDGED')),response_hex TEXT,receipt TEXT,
 UNIQUE(session_id,sequence));
 CREATE TRIGGER admin_plan_immutable BEFORE UPDATE ON admin_operations WHEN
 OLD.plan_hash IS NOT NULL AND (NEW.plan_hash IS NOT OLD.plan_hash OR NEW.id IS NOT OLD.id OR NEW.provisioning_id IS NOT OLD.provisioning_id
 OR NEW.base_url IS NOT OLD.base_url OR NEW.user_id IS NOT OLD.user_id OR NEW.station IS NOT OLD.station)
 BEGIN SELECT RAISE(ABORT,'administrative plan is immutable');END;
 CREATE TRIGGER admin_session_immutable BEFORE UPDATE ON admin_rf_sessions WHEN
 NEW.id IS NOT OLD.id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.base_url IS NOT OLD.base_url OR NEW.user_id IS NOT OLD.user_id
 OR NEW.rf_id IS NOT OLD.rf_id OR NEW.station IS NOT OLD.station OR NEW.session_marker IS NOT OLD.session_marker
 OR NEW.recovery IS NOT OLD.recovery OR NEW.materials IS NOT OLD.materials OR (OLD.ended=1 AND NEW.ended<>1)
 BEGIN SELECT RAISE(ABORT,'administrative RF identity is immutable');END;
 CREATE TRIGGER admin_command_immutable BEFORE UPDATE ON admin_commands WHEN
 NEW.command_id IS NOT OLD.command_id OR NEW.session_id IS NOT OLD.session_id OR NEW.sequence IS NOT OLD.sequence OR NEW.frame IS NOT OLD.frame
 OR (OLD.response_hex IS NOT NULL AND NEW.response_hex IS NOT OLD.response_hex)
 OR (OLD.receipt IS NOT NULL AND NEW.receipt IS NOT OLD.receipt)
 OR (OLD.state<>'READY' AND NEW.state='READY') OR (OLD.state='ACKNOWLEDGED' AND NEW.state<>'ACKNOWLEDGED')
 BEGIN SELECT RAISE(ABORT,'administrative command/response is immutable');END;
 CREATE TABLE admin_activation(sequence INTEGER PRIMARY KEY AUTOINCREMENT,operation_id TEXT NOT NULL REFERENCES admin_operations(id),base_url TEXT NOT NULL,user_id TEXT NOT NULL,
 reading TEXT NOT NULL,captured_at TEXT NOT NULL,receipt TEXT,rejection_code TEXT);
 CREATE UNIQUE INDEX admin_activation_pending ON admin_activation(operation_id) WHERE rejection_code IS NULL;
 CREATE TRIGGER admin_activation_immutable BEFORE UPDATE ON admin_activation WHEN
 NEW.operation_id IS NOT OLD.operation_id OR NEW.base_url IS NOT OLD.base_url OR NEW.user_id IS NOT OLD.user_id OR NEW.reading IS NOT OLD.reading
 OR NEW.captured_at IS NOT OLD.captured_at OR (OLD.receipt IS NOT NULL AND (NEW.receipt IS NOT OLD.receipt OR NEW.rejection_code IS NOT OLD.rejection_code))
 OR (OLD.rejection_code IS NOT NULL AND NEW.rejection_code IS NOT OLD.rejection_code)
 BEGIN SELECT RAISE(ABORT,'activation evidence is immutable');END;
 PRAGMA user_version=1;`;
function decode(row: SessionRow): AdminRfSession {
  return {
    id: row.id,
    operationId: row.operation_id,
    owner: {baseUrl: row.base_url, userId: row.user_id},
    rfId: row.rf_id,
    station: row.station,
    sessionMarker: row.session_marker,
    recovery: !!row.recovery,
    materials: JSON.parse(row.materials),
    reply: row.reply ? JSON.parse(row.reply) : null,
    ended: !!row.ended,
  };
}
export class SqliteAdministrationStore implements AdminStore {
  private initialized?: Promise<void>;
  constructor(private readonly open: () => Promise<SqlConnection>) {}
  initialize(): Promise<void> {
    this.initialized ??= (async () => {
      const db = await this.open();
      await db.exec(
        'PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;PRAGMA busy_timeout=5000',
      );
      await db.transaction(async tx => {
        const version = await tx.first<{user_version: number}>(
          'PRAGMA user_version',
        );
        if ((version?.user_version ?? 0) > 1)
          throw new AdministrationError(
            'ADMIN_BANCO_INCOMPATIVEL',
            'Atualize o aplicativo antes de abrir o diário administrativo.',
          );
        if (!version?.user_version) await tx.exec(schema);
      });
    })().catch(e => {
      this.initialized = undefined;
      throw e;
    });
    return this.initialized;
  }
  private async db(): Promise<SqlConnection> {
    await this.initialize();
    return this.open();
  }
  async draft(
    provisioningId: string,
    owner: AdminOwner,
  ): Promise<AdminDraft | null> {
    const row = await (
      await this.db()
    ).first<OperationRow>(
      'SELECT * FROM admin_operations WHERE provisioning_id=? AND base_url=? AND user_id=?',
      [provisioningId, owner.baseUrl, owner.userId],
    );
    return row
      ? {
          id: row.id,
          provisioningId: row.provisioning_id,
          owner,
          station: row.station,
        }
      : null;
  }
  async saveDraft(d: AdminDraft): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      const previous = await tx.first<OperationRow>(
        'SELECT * FROM admin_operations WHERE id=?',
        [d.id],
      );
      if (previous) {
        if (
          previous.base_url !== d.owner.baseUrl ||
          previous.user_id !== d.owner.userId ||
          previous.provisioning_id !== d.provisioningId ||
          previous.station !== d.station
        )
          fail('O identificador da preparação já possui outra origem.');
        return;
      }
      await tx.run(
        'INSERT INTO admin_operations(id,provisioning_id,base_url,user_id,station) VALUES(?,?,?,?,?)',
        [d.id, d.provisioningId, d.owner.baseUrl, d.owner.userId, d.station],
      );
    });
  }
  async saveOperation(op: AdminOperation, owner: AdminOwner): Promise<void> {
    assertOperation(op, owner);
    await (
      await this.db()
    ).transaction(async tx => {
      const row = await tx.first<OperationRow>(
        'SELECT * FROM admin_operations WHERE id=?',
        [op.id],
      );
      if (row) {
        if (
          row.base_url !== owner.baseUrl ||
          row.user_id !== owner.userId ||
          row.provisioning_id !== op.plano.provisionamentoId ||
          row.station !== op.estacao ||
          (row.plan_hash !== null && row.plan_hash !== op.hashPlano)
        )
          fail(
            'O alvo/plano original foi preservado. Consulte a API de origem.',
          );
        if (
          row.snapshot &&
          JSON.stringify((JSON.parse(row.snapshot) as AdminOperation).plano) !==
            JSON.stringify(op.plano)
        )
          fail('O conteúdo do plano não pode mudar.');
        await tx.run(
          'UPDATE admin_operations SET plan_hash=?,snapshot=? WHERE id=?',
          [op.hashPlano, JSON.stringify(op), op.id],
        );
      } else {
        // A server lookup can recover a preparation created on another installation.
        // Adopt it only over a local draft that never acquired a plan or RF session.
        await tx.run(
          `DELETE FROM admin_operations WHERE provisioning_id=? AND base_url=? AND user_id=?
          AND plan_hash IS NULL AND snapshot IS NULL AND NOT EXISTS(SELECT 1 FROM admin_rf_sessions WHERE operation_id=admin_operations.id)`,
          [op.plano.provisionamentoId, owner.baseUrl, owner.userId],
        );
        await tx.run('INSERT INTO admin_operations VALUES(?,?,?,?,?,?,?)', [
          op.id,
          op.plano.provisionamentoId,
          owner.baseUrl,
          owner.userId,
          op.estacao,
          op.hashPlano,
          JSON.stringify(op),
        ]);
      }
    });
  }
  async operation(
    id: string,
    owner: AdminOwner,
  ): Promise<AdminOperation | null> {
    const row = await (
      await this.db()
    ).first<OperationRow>(
      'SELECT * FROM admin_operations WHERE id=? AND base_url=? AND user_id=?',
      [id, owner.baseUrl, owner.userId],
    );
    return row?.snapshot ? JSON.parse(row.snapshot) : null;
  }
  async saveSession(s: AdminRfSession): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      const operation = await tx.first<OperationRow>(
        'SELECT * FROM admin_operations WHERE id=? AND base_url=? AND user_id=?',
        [s.operationId, s.owner.baseUrl, s.owner.userId],
      );
      if (!operation?.snapshot || operation.station !== s.station)
        fail('A sessão não corresponde a uma operação local preparada.');
      await tx.run(
        'INSERT INTO admin_rf_sessions(id,operation_id,base_url,user_id,rf_id,station,session_marker,recovery,materials) VALUES(?,?,?,?,?,?,?,?,?)',
        [
          s.id,
          s.operationId,
          s.owner.baseUrl,
          s.owner.userId,
          s.rfId,
          s.station,
          s.sessionMarker,
          s.recovery ? 1 : 0,
          JSON.stringify(s.materials),
        ],
      );
    });
  }
  async sessions(
    operationId: string,
    owner: AdminOwner,
  ): Promise<AdminRfSession[]> {
    return (
      await (
        await this.db()
      ).all<SessionRow>(
        'SELECT * FROM admin_rf_sessions WHERE operation_id=? AND base_url=? AND user_id=? ORDER BY sequence',
        [operationId, owner.baseUrl, owner.userId],
      )
    ).map(decode);
  }
  private async session(
    tx: SqlConnection,
    s: AdminRfSession,
  ): Promise<SessionRow> {
    const row = await tx.first<SessionRow>(
      'SELECT * FROM admin_rf_sessions WHERE id=? AND operation_id=? AND base_url=? AND user_id=?',
      [s.id, s.operationId, s.owner.baseUrl, s.owner.userId],
    );
    if (
      !row ||
      row.ended ||
      row.rf_id !== s.rfId ||
      row.session_marker !== s.sessionMarker ||
      row.station !== s.station
    )
      fail('Esta sessão NFC não permite nova transmissão.');
    return row!;
  }
  private async checkpoint(
    tx: SqlConnection,
    s: AdminRfSession,
    reply: AdminReply,
  ): Promise<void> {
    assertReply(reply, s.id);
    await tx.run('UPDATE admin_rf_sessions SET reply=? WHERE id=?', [
      JSON.stringify(reply),
      s.id,
    ]);
    if (reply.comando) {
      const existing = await tx.first<CommandRow>(
        'SELECT * FROM admin_commands WHERE command_id=?',
        [reply.comando.id],
      );
      if (existing) {
        if (
          existing.session_id !== s.id ||
          existing.frame !== JSON.stringify(reply.comando)
        )
          fail('A API devolveu um comando com conteúdo divergente.');
      } else
        await tx.run(
          "INSERT INTO admin_commands(command_id,session_id,sequence,frame,state) VALUES(?,?,?,?,'READY')",
          [
            reply.comando.id,
            s.id,
            reply.comando.sequencia,
            JSON.stringify(reply.comando),
          ],
        );
    }
  }
  async saveReply(s: AdminRfSession, reply: AdminReply): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      await this.session(tx, s);
      await this.checkpoint(tx, s, reply);
    });
  }
  private async command(
    tx: SqlConnection,
    s: AdminRfSession,
    frame: AdminCommand,
  ): Promise<CommandRow> {
    const row = await tx.first<CommandRow>(
      'SELECT * FROM admin_commands WHERE command_id=? AND session_id=?',
      [frame.id, s.id],
    );
    if (!row || row.frame !== JSON.stringify(frame))
      fail('O comando não corresponde ao diário original.');
    return row!;
  }
  async attempt(s: AdminRfSession, frame: AdminCommand): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      await this.session(tx, s);
      const command = await this.command(tx, s, frame);
      if (command.state !== 'READY')
        fail(
          'Este comando já teve uma tentativa física. Não o retransmita; abra outra sessão NFC para recuperar.',
        );
      const claimed = await tx.run(
        "UPDATE admin_commands SET state='ATTEMPTED' WHERE command_id=? AND state='READY'",
        [frame.id],
      );
      if (claimed.changes !== 1)
        fail(
          'A tentativa não foi confirmada em SQLite. Nenhum comando deve ser transmitido.',
        );
    });
  }
  async response(
    s: AdminRfSession,
    frame: AdminCommand,
    responseHex: string,
  ): Promise<void> {
    if (!/^(?:[0-9A-F]{2}){2,258}$/.test(responseHex))
      fail('A resposta NFC completa deve incluir SW1/SW2.');
    await (
      await this.db()
    ).transaction(async tx => {
      await this.session(tx, s);
      const row = await this.command(tx, s, frame);
      if (row.response_hex !== null) {
        if (row.response_hex !== responseHex)
          fail('A resposta NFC original foi preservada.');
        return;
      }
      if (row.state !== 'ATTEMPTED')
        fail('Nenhuma transmissão foi registrada para este comando.');
      await tx.run(
        "UPDATE admin_commands SET state='RESPONSE',response_hex=? WHERE command_id=?",
        [responseHex, frame.id],
      );
    });
  }
  async acknowledge(
    s: AdminRfSession,
    frame: AdminCommand,
    reply: AdminReply,
  ): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      await this.session(tx, s);
      const row = await this.command(tx, s, frame),
        json = JSON.stringify(reply);
      if (row.receipt !== null) {
        if (row.receipt !== json)
          fail('O primeiro recibo HTTP foi preservado.');
        return;
      }
      if (row.state !== 'RESPONSE')
        fail('Guarde a resposta NFC antes de enviá-la à API.');
      if (reply.comando && reply.comando.sequencia !== frame.sequencia + 1)
        fail('O checkpoint da API não corresponde à próxima etapa desta RF.');
      await tx.run(
        "UPDATE admin_commands SET state='ACKNOWLEDGED',receipt=? WHERE command_id=?",
        [json, frame.id],
      );
      await this.checkpoint(tx, s, reply);
    });
  }
  async commands(
    sessionId: string,
    owner: AdminOwner,
  ): Promise<LocalCommand[]> {
    const rows = await (
      await this.db()
    ).all<CommandRow>(
      `SELECT c.* FROM admin_commands c JOIN admin_rf_sessions s ON s.id=c.session_id
      WHERE s.id=? AND s.base_url=? AND s.user_id=? ORDER BY c.sequence`,
      [sessionId, owner.baseUrl, owner.userId],
    );
    return rows.map(r => ({
      sessionId: r.session_id,
      frame: JSON.parse(r.frame),
      state: r.state,
      responseHex: r.response_hex,
      receipt: r.receipt ? JSON.parse(r.receipt) : null,
    }));
  }
  async endSession(id: string, owner: AdminOwner): Promise<void> {
    await (
      await this.db()
    ).run(
      'UPDATE admin_rf_sessions SET ended=1 WHERE id=? AND base_url=? AND user_id=?',
      [id, owner.baseUrl, owner.userId],
    );
  }
  async activation(
    id: string,
    owner: AdminOwner,
  ): Promise<AdminActivation | null> {
    const row = await (
      await this.db()
    ).first<{reading: string; captured_at: string; receipt: string | null}>(
      'SELECT * FROM admin_activation WHERE operation_id=? AND base_url=? AND user_id=? AND rejection_code IS NULL',
      [id, owner.baseUrl, owner.userId],
    );
    return row
      ? {
          operationId: id,
          owner,
          reading: JSON.parse(row.reading),
          capturedAt: row.captured_at,
          receipt: row.receipt ? JSON.parse(row.receipt) : null,
        }
      : null;
  }
  async saveActivation(value: AdminActivation): Promise<void> {
    const db = await this.db();
    await db.transaction(async tx => {
      const op = await tx.first<OperationRow>(
        'SELECT * FROM admin_operations WHERE id=? AND base_url=? AND user_id=?',
        [value.operationId, value.owner.baseUrl, value.owner.userId],
      );
      if (
        !op?.snapshot ||
        (JSON.parse(op.snapshot) as AdminOperation).alteracaoFisica !==
          'CONFERIDA'
      )
        fail('A configuração ainda não foi conferida.');
      await tx.run(
        'INSERT INTO admin_activation(operation_id,base_url,user_id,reading,captured_at) VALUES(?,?,?,?,?)',
        [
          value.operationId,
          value.owner.baseUrl,
          value.owner.userId,
          JSON.stringify(value.reading),
          value.capturedAt,
        ],
      );
    });
  }
  async completeActivation(
    id: string,
    owner: AdminOwner,
    receipt: Provisioning,
  ): Promise<void> {
    await (
      await this.db()
    ).transaction(async tx => {
      const row = await tx.first<{receipt: string | null}>(
        'SELECT receipt FROM admin_activation WHERE operation_id=? AND base_url=? AND user_id=? AND rejection_code IS NULL',
        [id, owner.baseUrl, owner.userId],
      );
      if (!row)
        fail('A leitura de ativação não está no diário desta conta/API.');
      const json = JSON.stringify(receipt);
      if (row!.receipt !== null) {
        if (row!.receipt !== json)
          fail('O primeiro recibo de ativação foi preservado.');
        return;
      }
      await tx.run(
        'UPDATE admin_activation SET receipt=? WHERE operation_id=? AND rejection_code IS NULL',
        [json, id],
      );
    });
  }
  async rejectActivation(
    id: string,
    owner: AdminOwner,
    code: string,
  ): Promise<void> {
    await (
      await this.db()
    ).run(
      'UPDATE admin_activation SET rejection_code=? WHERE operation_id=? AND base_url=? AND user_id=? AND rejection_code IS NULL AND receipt IS NULL',
      [code, id, owner.baseUrl, owner.userId],
    );
  }
}
