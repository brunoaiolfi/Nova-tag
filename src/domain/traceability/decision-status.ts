import type {Decision} from './decision';

export function decisionStatus(decision: Decision['decisao']) {
  if (decision.status !== undefined) return decision.status;
  // Read compatibility for persisted decisions predating explicit status.
  // This preserves the server's decision; it never authorizes a new movement.
  if (decision.autorizada) return 'AUTORIZADA';
  if (decision.motivo === 'AGUARDANDO_ANTECEDENTE') return 'PENDENTE';
  if (decision.sdm?.temporalidade === 'TARDIA') return 'TARDIA';
  return 'REJEITADA';
}
export function businessOutcome(result: Decision) {
  const outcomes = {
    AUTORIZADA: 'ACCEPTED',
    PENDENTE: 'PENDING',
    REJEITADA: 'REJECTED',
    TARDIA: 'REJECTED',
  } as const;
  return outcomes[decisionStatus(result.decisao)];
}
