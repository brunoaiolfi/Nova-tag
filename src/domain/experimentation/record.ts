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
