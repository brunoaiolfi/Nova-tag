import {
  objectValue,
  textValue,
  nullableValue,
  booleanValue,
  listValue,
  invalidResponse,
} from '../contracts/values';
import {integer} from '../../domain/validation/values';
import type {Decision} from '../../domain/traceability/decision';
import {decodeDecision} from '../traceability/contracts/decision-decoder';

type BatchItem = {indice: number; id: string | null; mensagem: string} & (
  | {sucesso: true; status: 200; codigo: null; dados: Decision}
  | {sucesso: false; status: number; codigo: string; dados: null}
);
function decodeItem(input: unknown): BatchItem {
  const value = objectValue(input);
  if (!integer(value.indice, 0) || !integer(value.status, 200, 599))
    invalidResponse();
  const common = {
    indice: value.indice,
    id: nullableValue(value.id, textValue),
    mensagem: textValue(value.mensagem),
  };
  if (booleanValue(value.sucesso)) {
    if (value.status !== 200 || value.codigo !== null) invalidResponse();
    return {
      ...common,
      sucesso: true,
      status: 200,
      codigo: null,
      dados: decodeDecision(value.dados),
    };
  }
  if (value.status < 400 || value.dados !== null) invalidResponse();
  return {
    ...common,
    sucesso: false,
    status: value.status,
    codigo: textValue(value.codigo),
    dados: null,
  };
}
export function decodeBatch(input: unknown) {
  const value = objectValue(input);
  return {itens: listValue(value.itens, decodeItem)};
}
