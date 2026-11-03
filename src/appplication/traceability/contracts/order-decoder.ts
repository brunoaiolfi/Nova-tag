import type {OrderSummary, OrderDetails, OrderPage} from './order.types';
import {record, integer} from '../../../domain/validation/values';
import {SessionError} from '../../auth/session-error';
import {decodeProvisioning} from './provisioning-decoder';

function invalid(): never {
  throw new SessionError(
    'RESPOSTA_INVALIDA',
    'Pedido incompatível com o contrato.',
  );
}
export function decodeOrder(value: unknown): OrderSummary {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.codigo !== 'string' ||
    typeof value.estado !== 'string' ||
    (value.descricao !== null && typeof value.descricao !== 'string')
  )
    invalid();
  return {
    id: value.id,
    codigo: value.codigo,
    descricao: value.descricao,
    estado: value.estado,
  };
}
export function decodeOrderPage(value: unknown): OrderPage {
  if (!record(value) || !Array.isArray(value.itens) || !integer(value.total, 0))
    invalid();
  return {itens: Array.from(value.itens, decodeOrder), total: value.total};
}
export function decodeOrderDetails(value: unknown): OrderDetails {
  if (!record(value) || typeof value.expedido !== 'boolean') invalid();
  return {
    ...decodeOrder(value),
    expedido: value.expedido,
    ...(value.provisionamentoVigente !== undefined
      ? {
          provisionamentoVigente:
            value.provisionamentoVigente === null
              ? null
              : decodeProvisioning(value.provisionamentoVigente),
        }
      : {}),
  };
}
