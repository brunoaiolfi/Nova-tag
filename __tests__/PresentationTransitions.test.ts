import {
  initialProvisioningState,
  provisioningReducer,
} from '../src/views/Provisionar/Etapas/provisioning-state';
import {
  eventCaptureReducer,
  initialEventCaptureState,
  CaptureIntent,
} from '../src/views/Eventos/Etapas/event-capture-state';
import {
  administrationReducer,
  initialAdministrationState,
} from '../src/views/Provisionar/Administracao/administration-state';
import {
  initialManagementState,
  managementReducer,
} from '../src/views/Provisionar/Gerenciar/management-state';
import {operation, provisioning} from '../tests/support/administration';
import {EnumTipoEvento} from '../src/domain/enums/tipoEvento';
import {
  decisionStatus,
  businessOutcome,
} from '../src/domain/traceability/decision-status';
import {writeAccess} from '../src/domain/nfc/access-policy';
import type {Decision} from '../src/domain/traceability/decision';

const order = {
  id: provisioning.pedidoId,
  codigo: 'PEDIDO-1',
  descricao: null,
  estado: 'CADASTRADO',
};
test('changing the selected order invalidates reading, provisioning and confirmation together', () => {
  let state = provisioningReducer(initialProvisioningState(), {
    type: 'order-selected',
    order,
  });
  state = provisioningReducer(state, {
    type: 'reading-captured',
    evidence: {
      reading: {uid: provisioning.uid},
      capturedAt: '2026-10-23T10:00:00Z',
    },
  });
  state = provisioningReducer(state, {type: 'registered', provisioning});
  state = provisioningReducer(state, {
    type: 'confirmation-changed',
    confirmed: true,
  });
  const next = provisioningReducer(Object.freeze(state), {
    type: 'order-selected',
    order: {...order, id: 'different-order'},
  });
  expect(next.target.stage).toBe('selected');
  expect(next.target.evidence).toBeUndefined();
  expect(next.target.provisioning).toBeUndefined();
  expect(next.confirmed).toBe(false);
  expect(state.confirmed).toBe(true);
});
test('a local capture failure retains the exact identity and evidence for retry', () => {
  const intent: CaptureIntent = {
    id: 'stable-uuid',
    owner: {userId: 'operator', baseUrl: 'api'},
    occurredAt: '2026-10-23T10:00:00Z',
    reading: {uid: provisioning.uid},
  };
  let state = eventCaptureReducer(initialEventCaptureState, {
    type: 'event-selected',
    eventType: EnumTipoEvento.COLETA,
  });
  state = eventCaptureReducer(state, {type: 'captured', intent});
  state = eventCaptureReducer(state, {type: 'saving'});
  state = eventCaptureReducer(state, {type: 'failed', message: 'Disk full'});
  expect(state.stage).toBe('review');
  expect(state.intent).toBe(intent);
  expect(state.savedId).toBeUndefined();
});
test('an old administrative completion cannot clear the current running activity', () => {
  const running = administrationReducer(initialAdministrationState(), {
    type: 'operation-started',
    label: 'New operation',
    nfc: true,
  });
  expect(
    administrationReducer(running, {type: 'previous-operation-finished'}),
  ).toBe(running);
});
test('a new administrative operation invalidates the previous activation confirmation', () => {
  let state = administrationReducer(initialAdministrationState(), {
    type: 'operation-loaded',
    operation,
    materials: [],
    journal: [],
    pendingActivation: false,
  });
  state = administrationReducer(state, {
    type: 'activation-confirmed',
    confirmed: true,
  });
  state = administrationReducer(state, {
    type: 'operation-loaded',
    operation: {...operation, id: 'new-operation'},
    materials: [],
    journal: [],
    pendingActivation: false,
  });
  expect(state.activationConfirmed).toBe(false);
  expect(administrationReducer(state, {type: 'scope-reset'})).toEqual(
    initialAdministrationState(),
  );
});
test('changing a management target resets its confirmation and old context', () => {
  let state = managementReducer(
    initialManagementState(provisioning.id, 'account-A'),
    {type: 'request-closure'},
  );
  state = managementReducer(state, {type: 'toggle-confirmation'});
  state = managementReducer(state, {
    type: 'route-changed',
    provisioningId: 'other-link',
    sessionScope: 'account-B',
  });
  expect(state.confirmation).toBe('hidden');
  expect(state.context).toBeUndefined();
  expect(state.selection).toEqual({id: 'other-link'});
});
test('explicit decision status takes precedence over legacy contradictory fields', () => {
  const decision: Decision = {
    armazenada: true,
    decisao: {
      status: 'REJEITADA',
      autorizada: true,
      motivo: 'OK',
      classificacao: 'NORMAL',
      avisos: [],
    },
  };
  expect(decisionStatus(decision.decisao)).toBe('REJEITADA');
  expect(businessOutcome(decision)).toBe('REJECTED');
  expect(decisionStatus({...decision.decisao, status: undefined})).toBe(
    'AUTORIZADA',
  );
  expect(
    decisionStatus({
      ...decision.decisao,
      status: undefined,
      autorizada: false,
      motivo: 'AGUARDANDO_ANTECEDENTE',
    }),
  ).toBe('PENDENTE');
});
test('write protection accounts for both access routes', () => {
  expect(writeAccess({write: 0, readWrite: 14, read: 14, change: 0})).toBe(
    'free',
  );
  expect(writeAccess({write: 15, readWrite: 15, read: 14, change: 0})).toBe(
    'blocked',
  );
  expect(writeAccess({write: 0, readWrite: 15, read: 14, change: 0})).toBe(
    'key',
  );
});
