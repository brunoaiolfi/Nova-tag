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
