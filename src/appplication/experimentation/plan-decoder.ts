import type {ExperimentPlan} from '../../domain/experimentation/plan';
import {record, integer, oneOf} from '../../domain/validation/values';
import {invalidResponse as invalid} from '../contracts/values';

export function decodeExperimentPlan(
  value: unknown,
  timeoutMs?: number,
): ExperimentPlan {
  if (
    !record(value) ||
    (value.timeoutMs !== undefined && !integer(value.timeoutMs, 1))
  )
    invalid();
  if (
    typeof value.id !== 'string' ||
    typeof value.runId !== 'string' ||
    typeof value.sessionId !== 'string' ||
    typeof value.tagLabel !== 'string' ||
    typeof value.boxLabel !== 'string' ||
    typeof value.deviceId !== 'string' ||
    typeof value.deviceModel !== 'string' ||
    typeof value.osVersion !== 'string' ||
    typeof value.provisioningId !== 'string' ||
    typeof value.scenario !== 'string' ||
    typeof value.eventType !== 'string' ||
    !integer(value.ordinal, 1) ||
    !oneOf(value.treatment, ['UID', 'NDEF_ESTATICO', 'SDM']) ||
    !oneOf(value.mode, ['LEITURA_FISICA', 'REEXECUCAO', 'SINTETICA']) ||
    (value.policy !== null &&
      !oneOf(value.policy, ['ESTRITA', 'REGISTRO_TARDIO']))
  )
    invalid();
  const resolvedTimeout = timeoutMs ?? value.timeoutMs;
  return {
    id: value.id,
    runId: value.runId,
    sessionId: value.sessionId,
    tagLabel: value.tagLabel,
    boxLabel: value.boxLabel,
    deviceId: value.deviceId,
    deviceModel: value.deviceModel,
    osVersion: value.osVersion,
    provisioningId: value.provisioningId,
    scenario: value.scenario,
    eventType: value.eventType,
    ordinal: value.ordinal,
    treatment: value.treatment,
    mode: value.mode,
    policy: value.policy,
    ...(resolvedTimeout !== undefined ? {timeoutMs: resolvedTimeout} : {}),
  };
}
