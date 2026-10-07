import type {Decision} from './types';

export function decisionStatus(d: Decision['decisao']) {
  return (
    d.status ??
    (d.autorizada
      ? 'AUTORIZADA'
      : d.motivo === 'AGUARDANDO_ANTECEDENTE'
      ? 'PENDENTE'
      : d.sdm?.temporalidade === 'TARDIA'
      ? 'TARDIA'
      : 'REJEITADA')
  );
}
export function businessOutcome(result: Decision) {
  const status = decisionStatus(result.decisao);
  return status === 'AUTORIZADA'
    ? ('ACCEPTED' as const)
    : status === 'PENDENTE'
    ? ('PENDING' as const)
    : ('REJECTED' as const);
}
