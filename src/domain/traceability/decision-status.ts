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
const businessOutcomes = {
  AUTORIZADA: 'ACCEPTED',
  PENDENTE: 'PENDING',
  REJEITADA: 'REJECTED',
  TARDIA: 'REJECTED',
} as const satisfies Record<
  ReturnType<typeof decisionStatus>,
  'ACCEPTED' | 'PENDING' | 'REJECTED'
>;

export function businessOutcome(result: Decision) {
  return businessOutcomes[decisionStatus(result.decisao)];
}
