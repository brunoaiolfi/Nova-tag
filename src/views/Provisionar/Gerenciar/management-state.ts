import type {Provisioning} from '../../../domain/traceability/provisioning';
import type {Reading} from '../../../domain/traceability/reading';
import type {OrderDetails} from '../../../appplication/traceability/contracts/order.types';

export type ProvisioningSelection = {id: string} | {reading: Reading};
export interface ProvisioningContext {
  provisioning: Provisioning;
  order: OrderDetails;
}
export interface ManagementState {
  routeProvisioningId?: string | undefined;
  sessionScope: string;
  selection?: ProvisioningSelection | undefined;
  context?: ProvisioningContext | undefined;
  scanning: boolean;
  task: 'idle' | 'loading' | 'closing';
  confirmation: 'hidden' | 'unchecked' | 'checked';
  message: string;
  revision: number;
}
export function initialManagementState(
  routeProvisioningId: string | undefined,
  sessionScope: string,
): ManagementState {
  return {
    routeProvisioningId,
    sessionScope,
    selection: routeProvisioningId ? {id: routeProvisioningId} : undefined,
    scanning: false,
    task: 'idle',
    confirmation: 'hidden',
    message: '',
    revision: 0,
  };
}
export type ManagementEvent =
  | {
      type: 'route-changed';
      provisioningId?: string | undefined;
      sessionScope: string;
    }
  | {type: 'selected'; selection: ProvisioningSelection}
  | {type: 'loading'}
  | {type: 'loaded'; context: ProvisioningContext}
  | {type: 'failed'; message: string}
  | {type: 'scan'; scanning: boolean}
  | {type: 'request-closure'}
  | {type: 'cancel-closure'}
  | {type: 'toggle-confirmation'}
  | {type: 'closing'}
  | {type: 'closed'; provisioning: Provisioning}
  | {type: 'reload'};
export function managementReducer(
  state: ManagementState,
  event: ManagementEvent,
): ManagementState {
  switch (event.type) {
    case 'route-changed':
      return initialManagementState(event.provisioningId, event.sessionScope);
    case 'selected':
      return {
        ...state,
        selection: event.selection,
        context: undefined,
        scanning: false,
        confirmation: 'hidden',
        message: '',
      };
    case 'loading':
      return {
        ...state,
        context: undefined,
        task: 'loading',
        confirmation: 'hidden',
        message: '',
      };
    case 'loaded':
      return {...state, context: event.context, task: 'idle'};
    case 'failed':
      return {...state, task: 'idle', message: event.message};
    case 'scan':
      return {...state, scanning: event.scanning};
    case 'request-closure':
      return {...state, confirmation: 'unchecked', message: ''};
    case 'cancel-closure':
      return {...state, confirmation: 'hidden'};
    case 'toggle-confirmation':
      return state.confirmation === 'hidden'
        ? state
        : {
            ...state,
            confirmation:
              state.confirmation === 'checked' ? 'unchecked' : 'checked',
          };
    case 'closing':
      return {...state, task: 'closing', message: ''};
    case 'closed':
      return state.context
        ? {
            ...state,
            task: 'idle',
            confirmation: 'hidden',
            message: '',
            context: {...state.context, provisioning: event.provisioning},
          }
        : state;
    case 'reload':
      return {...state, revision: state.revision + 1};
  }
}
