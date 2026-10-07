import {DatabaseSync} from 'node:sqlite';
import type {SqlConnection} from '../../src/infra/offline/sqlite-store';
import {SqliteAdministrationStore} from '../../src/infra/administration/sqlite-store';
import type {
  AdminOperation,
  AdminContext,
  AdminCommand,
  AdminReply,
  AdminRfSession,
} from '../../src/domain/administration/types';
import type {Provisioning} from '../../src/domain/traceability/types';
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const now = Date.parse('2026-10-07T12:00:00Z');
export const context: AdminContext = {
  baseUrl: 'http://127.0.0.1:3000/api/v1',
  userId: id(1),
  station: 'fixture-phone',
  sessionMarker: 'fingerprint-only',
};
export const provisioning: Provisioning = {
  id: id(2),
  pedidoId: id(3),
  uid: '04AABBCCDDEE01',
  epoca: 1,
  modelo: 'NTAG424DNA',
  estrategia: 'UID',
  referenciaNdef: null,
  status: 'REGISTRADA',
};
export const operation: AdminOperation = {
  id: id(4),
  administradorId: context.userId,
  estacao: context.station,
  criadaEm: new Date(now).toISOString(),
  sessaoAtivaId: null,
  hashPlano: 'a'.repeat(64),
  status: 'PREPARADA',
  alteracaoEmitida: false,
  conteudoConferido: false,
  alteracaoFisica: 'NAO_ALTERADA',
  plano: {
    versao: 1,
    finalidade: 'PERSONALIZACAO',
    provisionamentoId: provisioning.id,
    uid: provisioning.uid,
    epoca: 1,
    estrategia: 'UID',
    referenciaCredenciais: id(5),
    versoesChaves: [0, 0, 0, 0, 0],
    personalizacao: {
      perfil: 'nfc-trace.personalization.v1',
      referenciaAlvo: id(6),
      versoesAlvo: [1, 1, 1, 1, 1],
      imagemNdefHex: '00'.repeat(256),
      imagemCcHex: '00'.repeat(32),
      configuracaoCcFinalHex: '000300E0200000',
      configuracaoNdefFinalHex: '0003F0E0000100',
      perfilSdm: null,
    },
  },
};
export const frame: AdminCommand = {
  id: id(7),
  sequencia: 1,
  etapa: 'ATUAL_UID_0',
  apduHex: '9051000008000000000000000000',
  alteraTag: false,
};
export const session: AdminRfSession = {
  id: id(8),
  operationId: operation.id,
  owner: context,
  rfId: id(9),
  station: context.station,
  sessionMarker: context.sessionMarker,
  recovery: false,
  materials: ['ATUAL', 'ATUAL', 'ATUAL', 'ATUAL', 'ATUAL'],
  reply: null,
  ended: false,
};
export const verified: AdminOperation = {
  ...operation,
  status: 'PERSONALIZADA',
  alteracaoEmitida: true,
  conteudoConferido: true,
  alteracaoFisica: 'CONFERIDA',
};
export function reply(
  sid = session.id,
  command: AdminCommand | null = frame,
): AdminReply {
  return {
    sessaoId: sid,
    status: command ? 'EM_ANDAMENTO' : 'CONCLUIDA',
    comando: command,
    expiraEm: new Date(now + 180000).toISOString(),
    codigo: null,
    alteracaoFisica: command ? 'NAO_ALTERADA' : 'CONFERIDA',
    resultado: command
      ? null
      : {
          uid: provisioning.uid,
          personalizada: true,
          configuracaoNdefHex:
            operation.plano.personalizacao.configuracaoNdefFinalHex,
          versoesChaves: [1, 1, 1, 1, 1],
          slotsAutenticados: [0, 1, 2, 3, 4],
        },
  };
}
export function connection(db: DatabaseSync): SqlConnection {
  let tail = Promise.resolve();
  const sql: SqlConnection = {
    exec: async q => {
      db.exec(q);
    },
    run: async (q, p = []) => ({
      changes: Number(db.prepare(q).run(...p).changes),
    }),
    first: async <T>(q: string, p: (string | number | null)[] = []) =>
      (db.prepare(q).get(...p) as T) ?? null,
    all: async <T>(q: string, p: (string | number | null)[] = []) =>
      db.prepare(q).all(...p) as T[],
    transaction: work => {
      const pending = tail.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(sql);
          db.exec('COMMIT');
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      });
      tail = pending.then(
        () => {},
        () => {},
      );
      return pending;
    },
  };
  return sql;
}
export function localDatabase(path = ':memory:') {
  const db = new DatabaseSync(path),
    sql = connection(db),
    store = new SqliteAdministrationStore(async () => sql);
  return {db, sql, store};
}
