import type {
  ExperimentStorage,
  ExperimentPlan,
  ExperimentRecord,
} from '../../domain/experimentation/types';
import type {CaptureOwner} from '../../domain/offline/types';
import {OfflineError} from '../../domain/offline/types';
import type {SqlConnection} from '../offline/sqlite-store';

// Called by the capture-store v2 migration: both journals share the same durable database.
export const experimentSchema = [
  'CREATE TABLE experiment_selection(base_url TEXT NOT NULL,user_id TEXT NOT NULL,plan TEXT,hold INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(base_url,user_id))',
  "CREATE TABLE experiment_records(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,base_url TEXT NOT NULL,user_id TEXT NOT NULL,input TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0)",
  'CREATE INDEX experiment_records_owner ON experiment_records(base_url,user_id,state,next_at,sequence)',
  "CREATE UNIQUE INDEX experiment_once ON experiment_records(base_url,user_id,json_extract(input,'$.attemptId'),CASE WHEN json_extract(input,'$.stage') IN ('LEITURA_OK','LEITURA_FALHOU','LEITURA_INTERROMPIDA') THEN 'TERMINAL' ELSE json_extract(input,'$.stage') END) WHERE json_extract(input,'$.stage') IN ('LEITURA_OK','LEITURA_FALHOU','LEITURA_INTERROMPIDA','CONFIRMACAO_LOCAL','CONFIRMACAO_FINAL','COMUNICACAO_LIBERADA','DECISAO_CONSULTADA','RECONCILIACAO_CONCLUIDA')",
  "CREATE TRIGGER experiment_record_immutable BEFORE UPDATE OF id,base_url,user_id,input ON experiment_records BEGIN SELECT RAISE(ABORT,'experimental record is immutable'); END",
].join(';');
export async function insertExperimentalRecord(
  tx: SqlConnection,
  owner: CaptureOwner,
  record: ExperimentRecord,
) {
  const existing = await tx.first<{
    input: string;
    base_url: string;
    user_id: string;
  }>('SELECT input,base_url,user_id FROM experiment_records WHERE id=?', [
    record.id,
  ]);
  const input = JSON.stringify(record);
  if (existing) {
    if (
      existing.input !== input ||
      existing.base_url !== owner.baseUrl ||
      existing.user_id !== owner.userId
    )
      throw new OfflineError(
        'REGISTRO_EXPERIMENTAL_CONFLITANTE',
        'O estágio original foi preservado.',
      );
    return;
  }
  const single = [
    'LEITURA_OK',
    'LEITURA_FALHOU',
    'LEITURA_INTERROMPIDA',
    'CONFIRMACAO_LOCAL',
    'CONFIRMACAO_FINAL',
    'COMUNICACAO_LIBERADA',
    'DECISAO_CONSULTADA',
    'RECONCILIACAO_CONCLUIDA',
  ];
  if (single.includes(record.stage)) {
    const group = [
      'LEITURA_OK',
      'LEITURA_FALHOU',
      'LEITURA_INTERROMPIDA',
    ].includes(record.stage)
      ? ['LEITURA_OK', 'LEITURA_FALHOU', 'LEITURA_INTERROMPIDA']
      : [record.stage];
    const prior = await tx.first<{input: string}>(
      "SELECT input FROM experiment_records WHERE base_url=? AND user_id=? AND json_extract(input,'$.attemptId')=? AND json_extract(input,'$.stage') IN (" +
        group.map(() => '?').join(',') +
        ')',
      [owner.baseUrl, owner.userId, record.attemptId, ...group],
    );
    if (prior) {
      const r = JSON.parse(prior.input) as ExperimentRecord;
      if (
        r.stage !== record.stage ||
        r.trialId !== record.trialId ||
        r.observationId !== record.observationId
      )
        throw new OfflineError(
          'REGISTRO_EXPERIMENTAL_CONFLITANTE',
          'A conclusão original da tentativa foi preservada.',
        );
      return;
    }
  }
  await tx.run(
    'INSERT INTO experiment_records(id,base_url,user_id,input) VALUES(?,?,?,?)',
    [record.id, owner.baseUrl, owner.userId, input],
  );
}
export class SqliteExperimentJournal implements ExperimentStorage {
  constructor(
    private readonly open: () => Promise<SqlConnection>,
    private readonly migrate: () => Promise<void>,
  ) {}
  initialize() {
    return this.migrate();
  }
  private async db() {
    await this.initialize();
    return this.open();
  }
  async select(
    owner: CaptureOwner,
    plan: ExperimentPlan | null,
    hold: boolean,
  ) {
    const db = await this.db();
    await db.run(
      'INSERT INTO experiment_selection(base_url,user_id,plan,hold) VALUES(?,?,?,?) ON CONFLICT(base_url,user_id) DO UPDATE SET plan=excluded.plan,hold=excluded.hold',
      [
        owner.baseUrl,
        owner.userId,
        plan ? JSON.stringify(plan) : null,
        hold ? 1 : 0,
      ],
    );
  }
  async selection(owner: CaptureOwner) {
    const db = await this.db();
    const row = await db.first<{plan: string | null; hold: number}>(
      'SELECT plan,hold FROM experiment_selection WHERE base_url=? AND user_id=?',
      [owner.baseUrl, owner.userId],
    );
    return {
      plan: row?.plan ? (JSON.parse(row.plan) as ExperimentPlan) : null,
      hold: row?.hold === 1,
    };
  }
  async put(owner: CaptureOwner, record: ExperimentRecord) {
    const db = await this.db();
    await db.transaction(tx => insertExperimentalRecord(tx, owner, record));
  }
  async records(owner: CaptureOwner) {
    const db = await this.db();
    return (
      await db.all<{input: string}>(
        'SELECT input FROM experiment_records WHERE base_url=? AND user_id=? ORDER BY sequence',
        [owner.baseUrl, owner.userId],
      )
    ).map(r => JSON.parse(r.input) as ExperimentRecord);
  }
  async pending(owner: CaptureOwner, now: number) {
    const db = await this.db();
    return (
      await db.all<{input: string}>(
        "SELECT input FROM experiment_records WHERE base_url=? AND user_id=? AND state='PENDING' AND next_at<=? ORDER BY sequence LIMIT 100",
        [owner.baseUrl, owner.userId, now],
      )
    ).map(r => JSON.parse(r.input) as ExperimentRecord);
  }
  async sent(owner: CaptureOwner, id: string) {
    const db = await this.db();
    await db.run(
      "UPDATE experiment_records SET state='SENT' WHERE id=? AND base_url=? AND user_id=?",
      [id, owner.baseUrl, owner.userId],
    );
  }
  async retry(
    owner: CaptureOwner,
    id: string,
    now: number,
    definitive: boolean,
  ) {
    const db = await this.db();
    await db.run(
      "UPDATE experiment_records SET state=?,attempts=attempts+1,next_at=? + MIN(300000,1000*(1 << MIN(attempts,8))) WHERE id=? AND base_url=? AND user_id=? AND state='PENDING'",
      [definitive ? 'FAILED' : 'PENDING', now, id, owner.baseUrl, owner.userId],
    );
  }
  async counts(owner: CaptureOwner) {
    const db = await this.db();
    const rows = await db.all<{state: string; n: number}>(
      'SELECT state,COUNT(*) AS n FROM experiment_records WHERE base_url=? AND user_id=? GROUP BY state',
      [owner.baseUrl, owner.userId],
    );
    return {
      pending: rows.find(r => r.state === 'PENDING')?.n ?? 0,
      sent: rows.find(r => r.state === 'SENT')?.n ?? 0,
      failed: rows.find(r => r.state === 'FAILED')?.n ?? 0,
    };
  }
}
