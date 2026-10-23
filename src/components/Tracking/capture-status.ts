import type {QueuedCapture} from '../../domain/offline/capture';
import {decisionStatus} from '../../domain/traceability/decision-status';

export function captureStatus(item: QueuedCapture) {
  if (item.state === 'STORED')
    return item.businessState === 'ACCEPTED'
      ? 'Operação aceita'
      : item.businessState === 'PENDING'
      ? 'Salva no servidor · aguardando etapa anterior'
      : item.currentDecision &&
        decisionStatus(item.currentDecision.decisao) === 'TARDIA'
      ? 'Leitura tardia preservada · sem movimentação'
      : 'Operação rejeitada · pedido não alterado';
  return {
    QUEUED: 'Salva neste aparelho · aguardando envio',
    SENDING: 'Enviando · registro preservado',
    RETRY: 'Aguardando nova tentativa',
    AUTH_REQUIRED: 'Entre novamente com o operador original',
    CONFLICT: 'Conflito · registro original preservado',
    FAILED: 'Envio não aceito · confira o motivo',
  }[item.state];
}
