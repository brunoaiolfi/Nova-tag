import type {Reading} from '../../domain/traceability/reading';
import type {Provisioning} from '../../domain/traceability/provisioning';
import type {
  OrderSummary,
  OrderDetails,
} from '../../appplication/traceability/contracts/order.types';
import type {
  HistoryEntry,
  HistoryPage,
} from '../../appplication/traceability/contracts/history.types';

export type HistoryTarget =
  | {kind: 'tag'; reading: Reading}
  | {kind: 'order'; order: OrderSummary};
interface HistoryContext {
  order: OrderDetails;
  provisioning?: Provisioning;
}
interface HistoryState {
  sessionScope: string;
  target?: HistoryTarget;
  receivedReading?: Reading;
  context?: HistoryContext;
  entries: HistoryEntry[];
  scope: 'vinculo' | 'pedido';
  scanning: boolean;
  busy: boolean;
  message: string;
  nextPage: number | null;
  total: number;
  revision: number;
}
const emptyHistory = {
  context: undefined,
  entries: [],
  busy: false,
  message: '',
  nextPage: null,
  total: 0,
};
export function initialHistoryState(
  reading?: Reading,
  sessionScope = '',
): HistoryState {
  return {
    ...emptyHistory,
    sessionScope,
    receivedReading: reading,
    target: reading ? {kind: 'tag', reading} : undefined,
    scope: 'vinculo',
    scanning: false,
    revision: 0,
  };
}
type HistoryEvent =
  | {type: 'selected'; target?: HistoryTarget}
  | {type: 'route-reading'; reading: Reading}
  | {type: 'session-changed'; reading?: Reading; sessionScope: string}
  | {type: 'scope'; scope: HistoryState['scope']}
  | {type: 'scan'; scanning: boolean}
  | {type: 'reload'}
  | {type: 'loading'}
  | {type: 'loading-more'}
  | {type: 'loaded'; context: HistoryContext; history: HistoryPage}
  | {type: 'more-loaded'; history: HistoryPage}
  | {type: 'failed'; message: string};
export function historyReducer(
  state: HistoryState,
  event: HistoryEvent,
): HistoryState {
  switch (event.type) {
    case 'selected':
      return {
        ...state,
        ...emptyHistory,
        target: event.target,
        scope: event.target?.kind === 'tag' ? 'vinculo' : 'pedido',
        scanning: false,
      };
    case 'route-reading':
      return {
        ...initialHistoryState(event.reading, state.sessionScope),
        revision: state.revision + 1,
      };
    case 'session-changed':
      return initialHistoryState(event.reading, event.sessionScope);
    case 'scope':
      return {...state, ...emptyHistory, scope: event.scope};
    case 'scan':
      return {...state, scanning: event.scanning};
    case 'reload':
      return {...state, revision: state.revision + 1};
    case 'loading':
      return {...state, ...emptyHistory, busy: true};
    case 'loading-more':
      return {...state, busy: true, message: ''};
    case 'loaded':
      return {
        ...state,
        context: event.context,
        entries: event.history.itens,
        nextPage: event.history.proximaPagina,
        total: event.history.totalDoPedido,
        busy: false,
      };
    case 'more-loaded': {
      const identifiers = new Set(state.entries.map(entry => entry.id));
      return {
        ...state,
        entries: [
          ...state.entries,
          ...event.history.itens.filter(entry => !identifiers.has(entry.id)),
        ],
        nextPage: event.history.proximaPagina,
        total: event.history.totalDoPedido,
        busy: false,
      };
    }
    case 'failed':
      return {...state, busy: false, message: event.message};
  }
}
