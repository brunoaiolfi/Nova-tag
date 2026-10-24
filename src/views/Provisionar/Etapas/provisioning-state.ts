import type {OrderSummary} from '../../../appplication/traceability/contracts/order.types';
import type {Reading} from '../../../domain/traceability/reading';
import type {Provisioning} from '../../../domain/traceability/provisioning';

export interface PhysicalEvidence {
  reading: Reading;
  capturedAt: string;
}
type ProvisioningTarget =
  | {
      stage: 'empty';
      order?: undefined;
      evidence?: undefined;
      provisioning?: undefined;
    }
  | {
      stage: 'selected';
      order: OrderSummary;
      evidence?: undefined;
      provisioning?: undefined;
    }
  | {
      stage: 'captured';
      order: OrderSummary;
      evidence: PhysicalEvidence;
      provisioning?: undefined;
    }
  | {
      stage: 'registered';
      order: OrderSummary;
      evidence: PhysicalEvidence;
      provisioning: Provisioning;
    };
export interface ProvisioningState {
  target: ProvisioningTarget;
  model: string;
  mode: 'form' | 'read' | 'write' | 'create';
  task: 'idle' | 'registering' | 'activating';
  confirmed: boolean;
  message: string;
}
export type ProvisioningEvent =
  | {type: 'order-selected'; order?: OrderSummary | undefined}
  | {type: 'model-changed'; model: string}
  | {type: 'mode-changed'; mode: ProvisioningState['mode']}
  | {type: 'reading-captured'; evidence: PhysicalEvidence}
  | {type: 'registered'; provisioning: Provisioning}
  | {type: 'started'; task: 'registering' | 'activating'}
  | {type: 'settled'; message: string}
  | {type: 'drained'}
  | {type: 'message'; message: string}
  | {type: 'confirmation-changed'; confirmed: boolean}
  | {type: 'reset'; model: string};
export function initialProvisioningState(
  model = 'DESCONHECIDO',
): ProvisioningState {
  return {
    target: {stage: 'empty'},
    model,
    mode: 'form',
    task: 'idle',
    confirmed: false,
    message: '',
  };
}
export function provisioningReducer(
  state: ProvisioningState,
  event: ProvisioningEvent,
): ProvisioningState {
  switch (event.type) {
    case 'order-selected':
      return {
        ...state,
        target: event.order
          ? {stage: 'selected', order: event.order}
          : {stage: 'empty'},
        confirmed: false,
        mode: 'form',
        message: '',
      };
    case 'model-changed':
      return {...state, model: event.model, confirmed: false};
    case 'mode-changed':
      return {
        ...state,
        mode: event.mode,
        confirmed: event.mode === 'form' ? state.confirmed : false,
        message: '',
      };
    case 'reading-captured': {
      if (!state.target.order) return state;
      const target: ProvisioningTarget = state.target.provisioning
        ? {
            stage: 'registered',
            order: state.target.order,
            evidence: event.evidence,
            provisioning: state.target.provisioning,
          }
        : {
            stage: 'captured',
            order: state.target.order,
            evidence: event.evidence,
          };
      return {
        ...state,
        target,
        confirmed: false,
        mode: 'form',
        message: 'Etiqueta lida fisicamente.',
      };
    }
    case 'registered': {
      if (!state.target.order || !state.target.evidence) return state;
      return {
        ...state,
        target: {
          stage: 'registered',
          order: state.target.order,
          evidence: state.target.evidence,
          provisioning: event.provisioning,
        },
        confirmed: false,
      };
    }
    case 'started':
      return {...state, task: event.task, message: ''};
    case 'settled':
      return {...state, task: 'idle', message: event.message};
    case 'drained':
      return {...state, task: 'idle'};
    case 'message':
      return {...state, message: event.message};
    case 'confirmation-changed':
      return {...state, confirmed: event.confirmed};
    case 'reset':
      return initialProvisioningState(event.model);
  }
}
