import type {Strategy, Reading, Provisioning} from '../traceability/types';

export type Material = 'ATUAL' | 'ALVO';
export type PhysicalOutcome = 'NAO_ALTERADA' | 'NAO_CONFIRMADA' | 'CONFERIDA';
export interface AdminOwner {
  baseUrl: string;
  userId: string;
}
export interface AdminContext extends AdminOwner {
  station: string;
  sessionMarker: string;
}
export interface Personalization {
  perfil: 'nfc-trace.personalization.v1';
  referenciaAlvo: string;
  versoesAlvo: number[];
  imagemNdefHex: string;
  imagemCcHex: string;
  configuracaoNdefFinalHex: string;
  configuracaoCcFinalHex: string;
  perfilSdm: string | null;
}
export interface AdminOperation {
  id: string;
  plano: {
    versao: 1;
    finalidade: 'PERSONALIZACAO';
    provisionamentoId: string;
    uid: string;
    epoca: number;
    estrategia: Strategy;
    referenciaCredenciais: string;
    versoesChaves: number[];
    personalizacao: Personalization;
  };
  hashPlano: string;
  administradorId: string;
  estacao: string;
  criadaEm: string;
  sessaoAtivaId: string | null;
  status:
    | 'PREPARADA'
    | 'PERSONALIZANDO'
    | 'PERSONALIZADA'
    | 'INTERROMPIDA'
    | 'ENCERRADA';
  alteracaoEmitida: boolean;
  conteudoConferido: boolean;
  alteracaoFisica: PhysicalOutcome;
}
export interface AdminCommand {
  id: string;
  sequencia: number;
  etapa: string;
  apduHex: string;
  alteraTag: boolean;
}
export interface AdminReply {
  sessaoId: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDA' | 'INTERROMPIDA';
  expiraEm: string;
  comando: AdminCommand | null;
  resultado: {
    uid: string;
    personalizada: boolean;
    configuracaoNdefHex: string;
    versoesChaves: number[];
    slotsAutenticados: number[];
  } | null;
  codigo: string | null;
  alteracaoFisica: PhysicalOutcome;
}
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
export class AdministrationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AdministrationError';
  }
}
export function sameOwner(a: AdminOwner, b: AdminOwner): boolean {
  return a.baseUrl === b.baseUrl && a.userId === b.userId;
}
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : 'ADMINISTRACAO_INTERROMPIDA';
}

const uuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    v,
  );
const versions = (v: unknown) =>
  Array.isArray(v) &&
  v.length === 5 &&
  v.every(x => Number.isInteger(x) && x >= 0 && x <= 255);
const outcome = (v: unknown) =>
  ['NAO_ALTERADA', 'NAO_CONFIRMADA', 'CONFERIDA'].includes(String(v));
function invalid(): never {
  throw new AdministrationError(
    'ADMIN_CONTRATO_INVALIDO',
    'Resposta administrativa incompatível. Nenhum comando NFC será transmitido.',
  );
}
export function assertOperation(
  value: AdminOperation,
  owner: AdminOwner,
): void {
  const p = value?.plano,
    t = p?.personalizacao;
  if (
    !uuid(value?.id) ||
    !p ||
    p.versao !== 1 ||
    p.finalidade !== 'PERSONALIZACAO' ||
    !uuid(p.provisionamentoId) ||
    !/^[0-9A-F]{14}$/.test(p.uid) ||
    !Number.isSafeInteger(p.epoca) ||
    p.epoca < 1 ||
    !['UID', 'NDEF_ESTATICO', 'SDM'].includes(p.estrategia) ||
    !uuid(p.referenciaCredenciais) ||
    !versions(p.versoesChaves) ||
    !t ||
    t.perfil !== 'nfc-trace.personalization.v1' ||
    !uuid(t.referenciaAlvo) ||
    !versions(t.versoesAlvo) ||
    !/^[0-9A-F]{512}$/.test(t.imagemNdefHex) ||
    !/^[0-9A-F]{64}$/.test(t.imagemCcHex) ||
    !/^(?:[0-9A-F]{2}){7,40}$/.test(t.configuracaoNdefFinalHex) ||
    !/^[0-9A-F]{14}$/.test(t.configuracaoCcFinalHex) ||
    !/^[0-9a-f]{64}$/.test(value.hashPlano) ||
    value.administradorId !== owner.userId ||
    typeof value.estacao !== 'string' ||
    value.estacao.length < 3 ||
    value.estacao.length > 128 ||
    ![
      'PREPARADA',
      'PERSONALIZANDO',
      'PERSONALIZADA',
      'INTERROMPIDA',
      'ENCERRADA',
    ].includes(value.status) ||
    !outcome(value.alteracaoFisica) ||
    typeof value.alteracaoEmitida !== 'boolean' ||
    typeof value.conteudoConferido !== 'boolean' ||
    !Number.isFinite(Date.parse(value.criadaEm)) ||
    (value.sessaoAtivaId !== null && !uuid(value.sessaoAtivaId)) ||
    (p.estrategia === 'SDM'
      ? t.perfilSdm !== 'nfc-trace.sdm.encrypted-picc.v1'
      : t.perfilSdm !== null)
  )
    invalid();
}
/** Transport allowlist; cryptographic verification stays in the server. Reject unknown/irreversible instructions. */
export function commandBytes(frame: AdminCommand): number[] {
  if (
    !frame ||
    !uuid(frame.id) ||
    !Number.isSafeInteger(frame.sequencia) ||
    frame.sequencia < 1 ||
    typeof frame.etapa !== 'string' ||
    !/^(?:[0-9A-F]{2}){6,128}$/.test(frame.apduHex)
  )
    invalid();
  const b = frame.apduHex.match(/../g)!.map(x => parseInt(x, 16));
  const ins = b[1],
    length = b[4];
  if (
    b[0] !== 0x90 ||
    b[2] !== 0 ||
    b[3] !== 0 ||
    b.at(-1) !== 0 ||
    length !== b.length - 6
  )
    invalid();
  const mutates = [0x8d, 0x5f, 0xc4].includes(ins);
  if (frame.alteraTag !== mutates) invalid();
  if (ins === 0x71) {
    if (length !== 2 || b[5] > 4 || b[6] !== 0) invalid();
  } else if (ins === 0x77) {
    if (length !== 1 || b[5] > 4) invalid();
  } else if (ins === 0xaf) {
    if (length !== 32) invalid();
  } else if (ins === 0x51) {
    if (length !== 8) invalid();
  } else if (ins === 0xf5) {
    if (length !== 9 || ![1, 2].includes(b[5])) invalid();
  } else if (ins === 0x64) {
    if (length !== 9 || b[5] > 4) invalid();
  } else if (ins === 0xad || ins === 0x8d) {
    const offset = b[6] + b[7] * 256 + b[8] * 65536,
      count = b[9] + b[10] * 256 + b[11] * 65536;
    if (
      ![1, 2].includes(b[5]) ||
      count < 1 ||
      count > 80 ||
      offset + count > (b[5] === 1 ? 32 : 256)
    )
      invalid();
    if (
      ins === 0xad
        ? length !== 15
        : length !== 7 + (Math.floor(count / 16) + 1) * 16 + 8
    )
      invalid();
  } else if (ins === 0x5f) {
    if (![25, 41].includes(length) || ![1, 2].includes(b[5])) invalid();
  } else if (ins === 0xc4) {
    if (length !== 41 || b[5] > 4) invalid();
  } else invalid();
  return b;
}
export function assertReply(reply: AdminReply, sessionId: string): void {
  if (
    !reply ||
    reply.sessaoId !== sessionId ||
    !Number.isFinite(Date.parse(reply.expiraEm)) ||
    !outcome(reply.alteracaoFisica) ||
    !['EM_ANDAMENTO', 'CONCLUIDA', 'INTERROMPIDA'].includes(reply.status)
  )
    invalid();
  if (reply.status === 'EM_ANDAMENTO') {
    if (!reply.comando || reply.resultado !== null || reply.codigo !== null)
      invalid();
    commandBytes(reply.comando);
  } else if (reply.comando !== null) invalid();
  if (
    reply.status === 'CONCLUIDA' &&
    (reply.codigo !== null ||
      reply.resultado?.personalizada !== true ||
      reply.alteracaoFisica !== 'CONFERIDA' ||
      !versions(reply.resultado.versoesChaves) ||
      !/^[0-9A-F]{14}$/.test(reply.resultado.uid) ||
      JSON.stringify(reply.resultado.slotsAutenticados) !== '[0,1,2,3,4]')
  )
    invalid();
}
