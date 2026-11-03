import type {Decision} from '../../../domain/traceability/decision';
import {oneOf, integer} from '../../../domain/validation/values';
import {
  objectValue,
  textValue,
  booleanValue,
  numberValue,
  listValue,
  nullableValue,
  invalidResponse,
} from '../../contracts/values';

function decodeSdm(input: unknown): NonNullable<Decision['decisao']['sdm']> {
  const value = objectValue(input);
  if (
    !oneOf(value.politica, ['ESTRITA', 'REGISTRO_TARDIO']) ||
    !oneOf(value.temporalidade, [
      'NAO_AVALIADA',
      'NOVA',
      'TARDIA',
      'REUTILIZADA',
    ])
  )
    invalidResponse();
  return {
    ...value,
    perfil: textValue(value.perfil),
    politica: value.politica,
    epoca: numberValue(value.epoca),
    autenticada: booleanValue(value.autenticada),
    previamenteUtilizada: booleanValue(value.previamenteUtilizada),
    contador: nullableValue(value.contador, numberValue),
    maiorContadorAnterior: nullableValue(
      value.maiorContadorAnterior,
      numberValue,
    ),
    temporalidade: value.temporalidade,
  };
}
export function decodeDecisionDetails(input: unknown): Decision['decisao'] {
  const value = objectValue(input);
  if (
    (value.revisao !== undefined && !integer(value.revisao, 1)) ||
    (value.status !== undefined &&
      !oneOf(value.status, ['AUTORIZADA', 'PENDENTE', 'REJEITADA', 'TARDIA']))
  )
    invalidResponse();
  return {
    ...value,
    autorizada: booleanValue(value.autorizada),
    motivo: textValue(value.motivo),
    classificacao: textValue(value.classificacao),
    avisos: listValue(value.avisos, textValue),
    ...(value.revisao !== undefined ? {revisao: value.revisao} : {}),
    ...(value.status !== undefined ? {status: value.status} : {}),
    ...(value.avaliadaEm !== undefined
      ? {avaliadaEm: textValue(value.avaliadaEm)}
      : {}),
    ...(value.causaId !== undefined
      ? {causaId: nullableValue(value.causaId, textValue)}
      : {}),
    ...(value.expiraEm !== undefined
      ? {expiraEm: nullableValue(value.expiraEm, textValue)}
      : {}),
    ...(value.dependencias !== undefined
      ? {
          dependencias: listValue(value.dependencias, inputDependency => {
            const dependency = objectValue(inputDependency);
            return {
              tipo: textValue(dependency.tipo),
              estadoNecessario: textValue(dependency.estadoNecessario),
            };
          }),
        }
      : {}),
    ...(value.sdm !== undefined ? {sdm: decodeSdm(value.sdm)} : {}),
  };
}
export function decodeDecision(input: unknown): Decision {
  const value = objectValue(input);
  return {
    ...value,
    armazenada: booleanValue(value.armazenada),
    decisao: decodeDecisionDetails(value.decisao),
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
