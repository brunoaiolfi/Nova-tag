import {businessOutcome} from '../../domain/traceability/decision-status';
import type {
  Observation,
  Provisioning,
  Decision,
  Reading,
} from '../../domain/traceability/types';
import {
  assertSdmReading,
  sdmProvisioningId,
} from '../../domain/traceability/sdm-reading';
import {
  CaptureOwner,
  CaptureStore,
  CaptureMetadata,
  QueuedCapture,
  Settlement,
  OfflineError,
} from '../../domain/offline/types';

export type SqlValue = string | number | null;
export interface SqlConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{changes: number}>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  transaction<T>(work: (tx: SqlConnection) => Promise<T>): Promise<T>;
}
type Row = {
  sequence: number;
  id: string;
  base_url: string;
  user_id: string;
  payload: string;
  metadata: string;
  order_id: string;
  created_at: number;
  state: QueuedCapture['state'];
  business_state: QueuedCapture['businessState'];
  attempts: number;
  next_attempt_at: number;
  claim: string | null;
  lease_until: number | null;
  receipt: string | null;
  current_decision: string | null;
  error_code: string | null;
  message: string | null;
};
const columns =
  'sequence,id,base_url,user_id,payload,metadata,order_id,created_at,state,business_state,attempts,next_attempt_at,claim,lease_until,receipt,current_decision,error_code,message';
const schema = [
  "CREATE TABLE captures (sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,base_url TEXT NOT NULL,user_id TEXT NOT NULL,payload TEXT NOT NULL,metadata TEXT NOT NULL,order_id TEXT NOT NULL,created_at INTEGER NOT NULL,state TEXT NOT NULL CHECK(state IN ('QUEUED','SENDING','RETRY','AUTH_REQUIRED','STORED','CONFLICT','FAILED')),business_state TEXT NOT NULL DEFAULT 'NONE' CHECK(business_state IN ('NONE','PENDING','ACCEPTED','REJECTED')),attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL DEFAULT 0,claim TEXT,lease_until INTEGER,receipt TEXT,current_decision TEXT,error_code TEXT,message TEXT)",
  'CREATE INDEX captures_dispatch ON captures(base_url,user_id,state,next_attempt_at,sequence)',
  'CREATE INDEX captures_order ON captures(base_url,user_id,order_id,sequence)',
  "CREATE TRIGGER capture_immutable BEFORE UPDATE OF id,base_url,user_id,payload,metadata,order_id,created_at ON captures BEGIN SELECT RAISE(ABORT,'capture is immutable'); END",
  "CREATE TRIGGER receipt_immutable BEFORE UPDATE OF receipt ON captures WHEN OLD.receipt IS NOT NULL AND NEW.receipt IS NOT OLD.receipt BEGIN SELECT RAISE(ABORT,'receipt is immutable'); END",
  'CREATE TABLE provisioning_cache (base_url TEXT NOT NULL,user_id TEXT NOT NULL,id TEXT NOT NULL,uid TEXT NOT NULL,snapshot TEXT NOT NULL,verified_at INTEGER NOT NULL,PRIMARY KEY(base_url,user_id,id))',
  'CREATE INDEX provisioning_uid ON provisioning_cache(base_url,user_id,uid,verified_at)',
  'PRAGMA user_version = 1',
].join(';');
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => freeze(child));
    Object.freeze(value);
  }
  return value;
}
function decode(row: Row): QueuedCapture {
  return freeze({
    sequence: row.sequence,
    id: row.id,
    owner: {baseUrl: row.base_url, userId: row.user_id},
    payload: JSON.parse(row.payload),
    metadata: JSON.parse(row.metadata),
    createdAt: row.created_at,
    state: row.state,
    businessState: row.business_state,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    claim: row.claim,
    leaseUntil: row.lease_until,
    receipt: row.receipt ? JSON.parse(row.receipt) : null,
    currentDecision: row.current_decision
      ? JSON.parse(row.current_decision)
      : null,
    errorCode: row.error_code,
    message: row.message,
  });
}
const uid = (value: string) => value.replace(/[\s:-]/g, '').toUpperCase();
export class SqliteCaptureStore implements CaptureStore {
  private initialization?: Promise<void>;
  constructor(private readonly open: () => Promise<SqlConnection>) {}
  initialize() {
    this.initialization ??= this.migrate().catch(error => {
      this.initialization = undefined;
      throw error;
    });
    return this.initialization;
  }
  private async migrate() {
    const db = await this.open();
    await db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;',
    );
    await db.transaction(async tx => {
      const version = await tx.first<{user_version: number}>(
        'PRAGMA user_version',
      );
      if ((version?.user_version ?? 0) > 1)
        throw new OfflineError(
          'BANCO_INCOMPATIVEL',
          'Atualize o aplicativo para acessar as capturas salvas.',
        );
      if (!version?.user_version) await tx.exec(schema);
    });
  }
  private async db() {
    await this.initialize();
    return this.open();
  }
  async enqueue(
    owner: CaptureOwner,
    payload: Observation,
    metadata: CaptureMetadata,
    now: number,
  ) {
    const serialized = JSON.stringify(payload);
    const savedMetadata = JSON.stringify(metadata);
    const db = await this.db();
    return db.transaction(async tx => {
      const previous = await tx.first<Row>(
        'SELECT ' + columns + ' FROM captures WHERE id=?',
        [payload.id],
      );
      if (previous) {
        if (
          previous.payload !== serialized ||
          previous.base_url !== owner.baseUrl ||
          previous.user_id !== owner.userId
        ) {
          throw new OfflineError(
            'CAPTURA_LOCAL_CONFLITANTE',
            'O identificador já pertence a outra captura. O registro original foi preservado.',
          );
        }
        return decode(previous);
      }
      await tx.run(
        "INSERT INTO captures(id,base_url,user_id,payload,metadata,order_id,created_at,state) VALUES(?,?,?,?,?,?,?,'QUEUED')",
        [
          payload.id,
          owner.baseUrl,
          owner.userId,
          serialized,
          savedMetadata,
          metadata.provisioning.pedidoId,
          now,
        ],
      );
      const row = await tx.first<Row>(
        'SELECT ' + columns + ' FROM captures WHERE id=?',
        [payload.id],
      );
      if (!row) throw new Error('Capture insert missing');
      return decode(row);
    });
  }
  async list(owner: CaptureOwner) {
    const db = await this.db();
    return (
      await db.all<Row>(
        'SELECT ' +
          columns +
          ' FROM captures WHERE base_url=? AND user_id=? ORDER BY sequence DESC',
        [owner.baseUrl, owner.userId],
      )
    ).map(decode);
  }
  async get(owner: CaptureOwner, id: string) {
    const db = await this.db();
    const row = await db.first<Row>(
      'SELECT ' +
        columns +
        ' FROM captures WHERE id=? AND base_url=? AND user_id=?',
      [id, owner.baseUrl, owner.userId],
    );
    return row ? decode(row) : null;
  }
  async claim(
    owner: CaptureOwner,
    token: string,
    now: number,
    leaseMs: number,
    limit: number,
  ) {
    const db = await this.db();
    return db.transaction(async tx => {
      await tx.run(
        "UPDATE captures SET state='RETRY',claim=NULL,lease_until=NULL,next_attempt_at=? WHERE state='SENDING' AND lease_until<=?",
        [now, now],
      );
      const rows = await tx.all<Row>(
        'SELECT ' +
          columns
            .split(',')
            .map(column => 'c.' + column)
            .join(',') +
          " FROM captures c WHERE c.base_url=? AND c.user_id=? AND c.state IN ('QUEUED','RETRY') AND c.next_attempt_at<=? AND NOT EXISTS(SELECT 1 FROM captures earlier WHERE earlier.base_url=c.base_url AND earlier.user_id=c.user_id AND earlier.order_id=c.order_id AND earlier.sequence<c.sequence AND earlier.state IN ('QUEUED','RETRY','SENDING','AUTH_REQUIRED')) ORDER BY c.sequence LIMIT ?",
        [owner.baseUrl, owner.userId, now, limit],
      );
      for (const row of rows) {
        await tx.run(
          "UPDATE captures SET state='SENDING',attempts=attempts+1,claim=?,lease_until=? WHERE id=?",
          [token, now + leaseMs, row.id],
        );
      }
      return rows.map(row =>
        decode({
          ...row,
          state: 'SENDING',
          attempts: row.attempts + 1,
          claim: token,
          lease_until: now + leaseMs,
        }),
      );
    });
  }
  async settle(id: string, claim: string, result: Settlement) {
    const db = await this.db();
    const receipt = result.result ? JSON.stringify(result.result) : null;
    await db.run(
      "UPDATE captures SET state=?,business_state=?,next_attempt_at=?,receipt=COALESCE(receipt,?),current_decision=COALESCE(?,current_decision),error_code=?,message=?,claim=NULL,lease_until=NULL WHERE id=? AND state='SENDING' AND claim=?",
      [
        result.state,
        result.businessState ?? 'NONE',
        result.nextAttemptAt ?? 0,
        receipt,
        receipt,
        result.errorCode ?? null,
        result.message ?? null,
        id,
        claim,
      ],
    );
  }
  async resume(owner: CaptureOwner, now: number) {
    const db = await this.db();
    await db.run(
      "UPDATE captures SET state='QUEUED',next_attempt_at=?,error_code=NULL,message=NULL WHERE base_url=? AND user_id=? AND state IN ('RETRY','AUTH_REQUIRED')",
      [now, owner.baseUrl, owner.userId],
    );
  }
  async remember(owner: CaptureOwner, provisioning: Provisioning, now: number) {
    const db = await this.db();
    await db.transaction(async tx => {
      // A fresh UID lookup retires cached older epochs, without touching captures.
      if (provisioning.status !== 'DESPROVISIONADA') {
        await tx.run(
          'DELETE FROM provisioning_cache WHERE base_url=? AND user_id=? AND uid=? AND id<>?',
          [owner.baseUrl, owner.userId, uid(provisioning.uid), provisioning.id],
        );
      }
      await tx.run(
        'INSERT INTO provisioning_cache(base_url,user_id,id,uid,snapshot,verified_at) VALUES(?,?,?,?,?,?) ON CONFLICT(base_url,user_id,id) DO UPDATE SET snapshot=excluded.snapshot,uid=excluded.uid,verified_at=excluded.verified_at',
        [
          owner.baseUrl,
          owner.userId,
          provisioning.id,
          uid(provisioning.uid),
          JSON.stringify(provisioning),
          now,
        ],
      );
    });
  }
  async cached(
    owner: CaptureOwner,
    reading: Reading,
    now: number,
    maxAge: number,
  ) {
    const sdm = reading.ndef?.startsWith('urn:nfc-trace:sdm:');
    const reference =
      sdm ||
      (typeof reading.ndef === 'string' &&
        reading.ndef.startsWith('urn:nfc-trace:provisioning:'));
    const id = sdm
      ? sdmProvisioningId(reading.ndef!)
      : reference
      ? /^urn:nfc-trace:provisioning:([0-9a-f-]{36})$/i
          .exec(reading.ndef!)?.[1]
          ?.toLowerCase()
      : undefined;
    if (reference && !id)
      throw new OfflineError(
        'REFERENCIA_INVALIDA',
        'Referência NDEF inválida. Leia uma etiqueta provisionada.',
      );
    const db = await this.db();
    const row = await db.first<{snapshot: string; verified_at: number}>(
      'SELECT snapshot,verified_at FROM provisioning_cache WHERE base_url=? AND user_id=? AND ' +
        (reference ? 'id=?' : 'uid=?') +
        ' ORDER BY verified_at DESC LIMIT 1',
      [owner.baseUrl, owner.userId, reference ? id! : uid(reading.uid)],
    );
    if (!row || row.verified_at > now || now - row.verified_at > maxAge)
      return null;
    const p = JSON.parse(row.snapshot) as Provisioning;
    if (
      p.status !== 'ATIVA' ||
      (reference &&
        !sdm &&
        (p.estrategia !== 'NDEF_ESTATICO' || p.referenciaNdef !== reading.ndef))
    )
      return null;
    assertSdmReading(p, reading);
    return freeze(p);
  }
  async updateDecision(owner: CaptureOwner, id: string, result: Decision) {
    const db = await this.db();
    const business = businessOutcome(result);
    await db.run(
      "UPDATE captures SET current_decision=?,business_state=? WHERE id=? AND base_url=? AND user_id=? AND state='STORED' AND COALESCE(json_extract(current_decision,'$.decisao.revisao'),0) < ?",
      [
        JSON.stringify(result),
        business,
        id,
        owner.baseUrl,
        owner.userId,
        result.decisao.revisao ?? 1,
      ],
    );
  }
}
