import type {CaptureOwner} from '../offline/types';
export interface ExperimentPlan {
  id: string;
  runId: string;
  sessionId: string;
  tagLabel: string;
  boxLabel: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  provisioningId: string;
  treatment: 'UID' | 'NDEF_ESTATICO' | 'SDM';
  policy: 'ESTRITA' | 'REGISTRO_TARDIO' | null;
  scenario: string;
  mode: 'LEITURA_FISICA' | 'REEXECUCAO' | 'SINTETICA';
  ordinal: number;
  eventType: string;
  timeoutMs?: number;
}
export interface ExperimentRecord {
  id: string;
  trialId: string;
  attemptId: string;
  stage:
    | 'TENTATIVA_INICIADA'
    | 'LEITURA_OK'
    | 'LEITURA_FALHOU'
    | 'LEITURA_INTERROMPIDA'
    | 'CAPTURA_LOCAL'
    | 'CONFIRMACAO_LOCAL'
    | 'CONFIRMACAO_FINAL'
    | 'ENVIO_INICIADO'
    | 'ENVIO_CONFIRMADO'
    | 'ENVIO_FALHOU'
    | 'COMUNICACAO_LIBERADA'
    | 'DECISAO_CONSULTADA'
    | 'RECONCILIACAO_CONCLUIDA';
  observationId: string | null;
  deviceId: string;
  occurredAt: string;
  clockId: string;
  monotonicMs: number;
  durationMs: number | null;
  boundary:
    | 'INSTANTE'
    | 'SESSAO_NFC_ATE_EVIDENCIA'
    | 'ENVIO_ATE_RESPOSTA'
    | 'LIBERACAO_ATE_DECISAO_FINAL'
    | 'INICIO_ATE_CONFIRMACAO_LOCAL'
    | 'INICIO_ATE_DECISAO_FINAL';
  code: string | null;
}
export interface ExperimentalCapture {
  plan: ExperimentPlan;
  record: ExperimentRecord;
}
export interface Attempt {
  owner: CaptureOwner;
  plan: ExperimentPlan;
  id: string;
}
export interface ExperimentStorage {
  initialize(): Promise<void>;
  select(
    owner: CaptureOwner,
    plan: ExperimentPlan | null,
    hold: boolean,
  ): Promise<void>;
  selection(
    owner: CaptureOwner,
  ): Promise<{plan: ExperimentPlan | null; hold: boolean}>;
  put(owner: CaptureOwner, record: ExperimentRecord): Promise<void>;
  records(owner: CaptureOwner): Promise<ExperimentRecord[]>;
  pending(owner: CaptureOwner, now: number): Promise<ExperimentRecord[]>;
  sent(owner: CaptureOwner, id: string): Promise<void>;
  retry(
    owner: CaptureOwner,
    id: string,
    now: number,
    definitive: boolean,
  ): Promise<void>;
  counts(
    owner: CaptureOwner,
  ): Promise<{pending: number; sent: number; failed: number}>;
}
export interface MonotonicClock {
  originId: string;
  nowMs(): number;
}
