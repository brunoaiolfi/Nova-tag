import type {AdminReply} from './admin-reply.types';
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
  switch (value.status) {
    case 'EM_ANDAMENTO':
      if (value.resultado !== null || value.codigo !== null) invalid();
      decodeCommand(value.comando);
      break;
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
      break;
    }
    case 'INTERROMPIDA':
      if (
        value.comando !== null ||
        (value.codigo !== null && typeof value.codigo !== 'string')
      )
        invalid();
      if (value.resultado !== null && !isResult(value.resultado)) invalid();
      break;
  }
  return value as unknown as AdminReply;
}
function isResult(value: unknown): boolean {
  return (
    record(value) &&
    typeof value.uid === 'string' &&
    typeof value.personalizada === 'boolean' &&
    typeof value.configuracaoNdefHex === 'string' &&
    versions(value.versoesChaves) &&
    Array.isArray(value.slotsAutenticados) &&
    value.slotsAutenticados.every(slot => Number.isInteger(slot))
  );
}
