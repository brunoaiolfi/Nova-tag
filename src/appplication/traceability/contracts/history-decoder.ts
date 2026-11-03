import type {HistoryEntry} from './history.types';
import {oneOf, integer} from '../../../domain/validation/values';
import {
  objectValue,
  textValue,
  booleanValue,
  nullableValue,
  listValue,
  invalidResponse,
} from '../../contracts/values';
import {decodeDecisionDetails} from './decision-decoder';

function decodeAuthorship(input: unknown): HistoryEntry['autoria'] {
  if (input === null) return null;
  const value = objectValue(input);
  if (!oneOf(value.tipo, ['AUTENTICADA', 'DECLARADA'])) invalidResponse();
  return {
    tipo: value.tipo,
    usuarioId: nullableValue(value.usuarioId, textValue),
    perfil: nullableValue(value.perfil, textValue),
  };
}
export function decodeHistoryEntry(input: unknown): HistoryEntry {
  const value = objectValue(input);
  const decision = objectValue(value.decisao);
  if (!oneOf(value.origem, ['CAPTURA', 'SISTEMA'])) invalidResponse();
  return {
    id: textValue(value.id),
    tipo: textValue(value.tipo),
    ocorridoEm: textValue(value.ocorridoEm),
    recebidoEm: textValue(value.recebidoEm),
    provisionamentoId: textValue(value.provisionamentoId),
    origem: value.origem,
    autoria: decodeAuthorship(value.autoria),
    decisao: {
      ...decodeDecisionDetails(decision),
      alterouEstado: booleanValue(decision.alterouEstado),
      estadoAnterior: nullableValue(decision.estadoAnterior, textValue),
      estadoResultante: nullableValue(decision.estadoResultante, textValue),
    },
    ...(value.historicoDecisoes !== undefined
      ? {
          historicoDecisoes: listValue(
            value.historicoDecisoes,
            decodeDecisionDetails,
          ),
        }
      : {}),
  };
}
export function decodeHistoryItems(input: unknown): {
  itens: HistoryEntry[];
  total: number;
} {
  const value = objectValue(input);
  if (!integer(value.total, 0)) invalidResponse();
  return {
    itens: listValue(value.itens, decodeHistoryEntry),
    total: value.total,
  };
}
