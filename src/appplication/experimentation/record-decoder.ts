import type {ExperimentRecord} from '../../domain/experimentation/record';
import {oneOf} from '../../domain/validation/values';
import {
  objectValue,
  textValue,
  numberValue,
  nullableValue,
  invalidResponse,
} from '../contracts/values';

export function decodeExperimentRecord(input: unknown): ExperimentRecord {
  const value = objectValue(input);
  if (
    !oneOf(value.stage, [
      'TENTATIVA_INICIADA',
      'LEITURA_OK',
      'LEITURA_FALHOU',
      'LEITURA_INTERROMPIDA',
      'CAPTURA_LOCAL',
      'CONFIRMACAO_LOCAL',
      'CONFIRMACAO_FINAL',
      'ENVIO_INICIADO',
      'ENVIO_CONFIRMADO',
      'ENVIO_FALHOU',
      'COMUNICACAO_LIBERADA',
      'DECISAO_CONSULTADA',
      'RECONCILIACAO_CONCLUIDA',
    ]) ||
    !oneOf(value.boundary, [
      'INSTANTE',
      'SESSAO_NFC_ATE_EVIDENCIA',
      'ENVIO_ATE_RESPOSTA',
      'LIBERACAO_ATE_DECISAO_FINAL',
      'INICIO_ATE_CONFIRMACAO_LOCAL',
      'INICIO_ATE_DECISAO_FINAL',
    ])
  )
    invalidResponse();
  return {
    id: textValue(value.id),
    trialId: textValue(value.trialId),
    attemptId: textValue(value.attemptId),
    stage: value.stage,
    observationId: nullableValue(value.observationId, textValue),
    deviceId: textValue(value.deviceId),
    occurredAt: textValue(value.occurredAt),
    clockId: textValue(value.clockId),
    monotonicMs: numberValue(value.monotonicMs),
    durationMs: nullableValue(value.durationMs, numberValue),
    boundary: value.boundary,
    code: nullableValue(value.code, textValue),
  };
}
