import type {
  AdminOperation,
  Personalization,
} from '../../../domain/administration/operation';
import {
  uuid,
  versions,
  outcome,
} from '../../../domain/administration/contract-values';
import {invalid} from '../../../domain/administration/invalid-contract';
import {
  record,
  matches,
  integer,
  timestamp,
  oneOf,
} from '../../../domain/validation/values';

function personalization(value: unknown): value is Personalization {
  return (
    record(value) &&
    value.perfil === 'nfc-trace.personalization.v1' &&
    uuid(value.referenciaAlvo) &&
    versions(value.versoesAlvo) &&
    matches(value.imagemNdefHex, /^[0-9A-F]{512}$/) &&
    matches(value.imagemCcHex, /^[0-9A-F]{64}$/) &&
    matches(value.configuracaoNdefFinalHex, /^(?:[0-9A-F]{2}){7,40}$/) &&
    matches(value.configuracaoCcFinalHex, /^[0-9A-F]{14}$/) &&
    (value.perfilSdm === null ||
      value.perfilSdm === 'nfc-trace.sdm.encrypted-picc.v1')
  );
}
function plan(value: unknown): value is AdminOperation['plano'] {
  if (!record(value) || !personalization(value.personalizacao)) return false;
  return (
    value.versao === 1 &&
    value.finalidade === 'PERSONALIZACAO' &&
    uuid(value.provisionamentoId) &&
    matches(value.uid, /^[0-9A-F]{14}$/) &&
    integer(value.epoca, 1) &&
    oneOf(value.estrategia, ['UID', 'NDEF_ESTATICO', 'SDM']) &&
    uuid(value.referenciaCredenciais) &&
    versions(value.versoesChaves) &&
    value.personalizacao.perfilSdm ===
      (value.estrategia === 'SDM' ? 'nfc-trace.sdm.encrypted-picc.v1' : null)
  );
}
/** Decode remote/persisted data before applying execution-context policies. */
export function decodeOperation(value: unknown): AdminOperation {
  if (
    !record(value) ||
    !plan(value.plano) ||
    !uuid(value.id) ||
    !matches(value.hashPlano, /^[0-9a-f]{64}$/) ||
    typeof value.administradorId !== 'string' ||
    typeof value.estacao !== 'string' ||
    value.estacao.length < 3 ||
    value.estacao.length > 128 ||
    !oneOf(value.status, [
      'PREPARADA',
      'PERSONALIZANDO',
      'PERSONALIZADA',
      'INTERROMPIDA',
      'ENCERRADA',
    ]) ||
    !outcome(value.alteracaoFisica) ||
    typeof value.alteracaoEmitida !== 'boolean' ||
    typeof value.conteudoConferido !== 'boolean' ||
    !timestamp(value.criadaEm) ||
    (value.sessaoAtivaId !== null && !uuid(value.sessaoAtivaId))
  )
    invalid();
  return {
    id: value.id,
    plano: value.plano,
    hashPlano: value.hashPlano,
    administradorId: value.administradorId,
    estacao: value.estacao,
    criadaEm: value.criadaEm,
    sessaoAtivaId: value.sessaoAtivaId,
    status: value.status,
    alteracaoEmitida: value.alteracaoEmitida,
    conteudoConferido: value.conteudoConferido,
    alteracaoFisica: value.alteracaoFisica,
  };
}
