import type {AdminReply, PersonalizationResult} from './admin-reply.types';
import {
  versions,
  outcome,
} from '../../../domain/administration/contract-values';
import {invalid} from '../../../domain/administration/invalid-contract';
import {decodeCommand} from '../../../domain/nfc/administrative-command';
import {
  record,
  matches,
  timestamp,
  oneOf,
} from '../../../domain/validation/values';

export function decodeReply(value: unknown): AdminReply {
  if (
    !record(value) ||
    typeof value.sessaoId !== 'string' ||
    !timestamp(value.expiraEm) ||
    !outcome(value.alteracaoFisica) ||
    !oneOf(value.status, ['EM_ANDAMENTO', 'CONCLUIDA', 'INTERROMPIDA'])
  )
    invalid();
  const envelope = {
    sessaoId: value.sessaoId,
    expiraEm: value.expiraEm,
    alteracaoFisica: value.alteracaoFisica,
  };
  switch (value.status) {
    case 'EM_ANDAMENTO':
      if (value.resultado !== null || value.codigo !== null) invalid();
      return {
        ...envelope,
        status: value.status,
        comando: decodeCommand(value.comando),
        resultado: null,
        codigo: null,
      };
    case 'CONCLUIDA': {
      const result = value.resultado;
      if (
        value.comando !== null ||
        value.codigo !== null ||
        value.alteracaoFisica !== 'CONFERIDA' ||
        !record(result) ||
        result.personalizada !== true ||
        !versions(result.versoesChaves) ||
        !matches(result.uid, /^[0-9A-F]{14}$/) ||
        typeof result.configuracaoNdefHex !== 'string' ||
        JSON.stringify(result.slotsAutenticados) !== '[0,1,2,3,4]'
      )
        invalid();
      return {
        ...envelope,
        status: value.status,
        alteracaoFisica: 'CONFERIDA',
        comando: null,
        codigo: null,
        resultado: {...decodeResult(result), personalizada: true},
      };
    }
    case 'INTERROMPIDA':
      if (
        value.comando !== null ||
        (value.codigo !== null && typeof value.codigo !== 'string')
      )
        invalid();
      return {
        ...envelope,
        status: value.status,
        comando: null,
        codigo: value.codigo,
        resultado:
          value.resultado === null ? null : decodeResult(value.resultado),
      };
  }
}
function decodeResult(value: unknown): PersonalizationResult {
  if (
    !record(value) ||
    typeof value.uid !== 'string' ||
    typeof value.personalizada !== 'boolean' ||
    typeof value.configuracaoNdefHex !== 'string' ||
    !versions(value.versoesChaves) ||
    !Array.isArray(value.slotsAutenticados) ||
    !Array.from(value.slotsAutenticados).every(
      (slot: unknown): slot is number =>
        typeof slot === 'number' && Number.isInteger(slot),
    )
  )
    invalid();
  return {
    uid: value.uid,
    personalizada: value.personalizada,
    configuracaoNdefHex: value.configuracaoNdefHex,
    versoesChaves: value.versoesChaves,
    slotsAutenticados: value.slotsAutenticados,
  };
}
