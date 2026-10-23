import type {OrderSummary} from '../../../appplication/traceability/contracts/order.types';
import type {Provisioning} from '../../../domain/traceability/provisioning';
import type {Strategy} from '../../../domain/traceability/reading';
import type {
  AdminOperation,
  Material,
} from '../../../domain/administration/operation';
import type {
  AdministrationCoordinator,
  AdministrationProgress,
} from '../../../appplication/administration/coordinator';

interface AdministrationActivity {
  kind: 'running' | 'waiting';
  label: string;
  nfc: boolean;
}
export interface AdministrationState {
  order?: OrderSummary;
  uid: string;
  setupStep: number;
  strategy?: Strategy;
  policy: 'ESTRITA' | 'REGISTRO_TARDIO';
  link?: Provisioning;
  operation?: AdminOperation;
  materials: (Material | null)[];
  confirmed: boolean;
  activationConfirmed: boolean;
  pendingActivation: boolean;
  progress?: AdministrationProgress;
  journal: Awaited<ReturnType<AdministrationCoordinator['localJournal']>>;
  activity: AdministrationActivity | null;
  endDialogOpen: boolean;
  message: string;
  failureOpen: boolean;
  blockingOperation?: AdminOperation;
  lookupError: string;
}
export function initialAdministrationState(): AdministrationState {
  return {
    uid: '',
    setupStep: 0,
    policy: 'ESTRITA',
    materials: [],
    confirmed: false,
    activationConfirmed: false,
    pendingActivation: false,
    journal: [],
    activity: null,
    endDialogOpen: false,
    message: '',
    failureOpen: false,
    lookupError: '',
  };
}
export type AdministrationEvent =
  | {type: 'scope-reset'}
  | {type: 'resumed'; waiting: boolean}
  | {type: 'order-selected'; order?: OrderSummary}
  | {type: 'tag-identified'; uid: string}
  | {type: 'step-changed'; step: number}
  | {type: 'strategy-selected'; strategy: Strategy}
  | {type: 'policy-selected'; policy: AdministrationState['policy']}
  | {type: 'link-loaded'; link: Provisioning}
  | {type: 'plan-loaded'; link: Provisioning; order: OrderSummary}
  | {
      type: 'operation-loaded';
      operation: AdminOperation;
      materials: (Material | null)[];
      journal: AdministrationState['journal'];
      pendingActivation: boolean;
    }
  | {type: 'operation-started'; label: string; nfc: boolean}
  | {type: 'operation-finished'}
  | {type: 'previous-operation-finished'}
  | {type: 'operation-failed'; message: string}
  | {type: 'progress'; progress: AdministrationProgress}
  | {type: 'configuration-confirmed'; confirmed: boolean}
  | {type: 'activation-confirmed'; confirmed: boolean}
  | {type: 'activation-completed'; link: Provisioning}
  | {type: 'failure-visibility'; open: boolean}
  | {type: 'blocking-operation'; operation: AdminOperation}
  | {type: 'lookup-failed'; message: string}
  | {type: 'dialog-visibility'; open: boolean}
  | {type: 'message'; message: string}
  | {type: 'material-selected'; index: number; material: Material};

export function administrationReducer(
  state: AdministrationState,
  event: AdministrationEvent,
): AdministrationState {
  switch (event.type) {
    case 'scope-reset':
      return initialAdministrationState();
    case 'resumed':
      return {
        ...state,
        activity: event.waiting
          ? {
              kind: 'waiting',
              label: 'Aguardando o encerramento da operação anterior',
              nfc: false,
            }
          : null,
      };
    case 'order-selected':
      return {
        ...state,
        order: event.order,
        confirmed: false,
        activationConfirmed: false,
      };
    case 'tag-identified':
      return {
        ...state,
        uid: event.uid,
        confirmed: false,
        activationConfirmed: false,
        message: '',
      };
    case 'step-changed':
      return {...state, setupStep: event.step};
    case 'strategy-selected':
      return {...state, strategy: event.strategy, confirmed: false};
    case 'policy-selected':
      return {...state, policy: event.policy, confirmed: false};
    case 'link-loaded':
      return {...state, link: event.link};
    case 'plan-loaded':
      return {
        ...state,
        link: event.link,
        order: event.order,
        uid: event.link.uid,
        strategy: event.link.estrategia,
      };
    case 'operation-loaded':
      return {
        ...state,
        operation: event.operation,
        materials: event.materials,
        journal: event.journal,
        pendingActivation: event.pendingActivation,
        confirmed: false,
        activationConfirmed:
          state.operation?.id === event.operation.id
            ? state.activationConfirmed
            : false,
      };
    case 'operation-started':
      return {
        ...state,
        activity: {kind: 'running', label: event.label, nfc: event.nfc},
        message: '',
        failureOpen: false,
        blockingOperation: undefined,
        lookupError: '',
        progress: event.nfc ? undefined : state.progress,
      };
    case 'operation-finished':
      return {...state, activity: null};
    case 'previous-operation-finished':
      return state.activity?.kind === 'waiting'
        ? {...state, activity: null}
        : state;
    case 'operation-failed':
      return {...state, message: event.message, failureOpen: true};
    case 'progress':
      return {...state, progress: event.progress};
    case 'configuration-confirmed':
      return {...state, confirmed: event.confirmed};
    case 'activation-confirmed':
      return {...state, activationConfirmed: event.confirmed};
    case 'activation-completed':
      return {
        ...state,
        link: event.link,
        pendingActivation: false,
        activationConfirmed: false,
        message: '',
      };
    case 'failure-visibility':
      return {...state, failureOpen: event.open};
    case 'blocking-operation':
      return {...state, blockingOperation: event.operation};
    case 'lookup-failed':
      return {...state, lookupError: event.message};
    case 'dialog-visibility':
      return {...state, endDialogOpen: event.open};
    case 'message':
      return {...state, message: event.message};
    case 'material-selected':
      return {
        ...state,
        materials: state.materials.map((material, index) =>
          index === event.index ? event.material : material,
        ),
      };
  }
}
