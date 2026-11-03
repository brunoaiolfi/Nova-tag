import {useEffect, useReducer, useRef, useSyncExternalStore} from 'react';
import {useAppServices} from '../Services/AppServicesProvider';
import type {
  OrderPage,
  OrderSummary,
} from '../../appplication/traceability/contracts/order.types';
import type {AuthSnapshot} from '../../appplication/auth/session-manager';

interface OrderSearchState {
  search: string;
  orders: OrderSummary[];
  page: number;
  total: number;
  busy: boolean;
  error: string;
  revision: number;
  auth: AuthSnapshot;
}
type OrderSearchEvent =
  | {type: 'search'; search: string}
  | {type: 'retry'}
  | {type: 'loading-more'}
  | {type: 'loaded'; result: OrderPage; page: number; auth: AuthSnapshot}
  | {type: 'failed'; error: string; auth: AuthSnapshot};
const emptyResult = {orders: [], page: 0, total: 0, busy: true, error: ''};
function reducer(
  state: OrderSearchState,
  event: OrderSearchEvent,
): OrderSearchState {
  switch (event.type) {
    case 'search':
      return {
        ...state,
        ...emptyResult,
        search: event.search,
        revision: state.revision + 1,
      };
    case 'retry':
      return {...state, ...emptyResult, revision: state.revision + 1};
    case 'loading-more':
      return {...state, busy: true, error: ''};
    case 'failed':
      return {...state, error: event.error, busy: false, auth: event.auth};
    case 'loaded': {
      const previous = event.page === 1 ? [] : state.orders;
      const identifiers = new Set(previous.map(order => order.id));
      return {
        ...state,
        orders: [
          ...previous,
          ...event.result.itens.filter(order => !identifiers.has(order.id)),
        ],
        total: event.result.total,
        page: event.page,
        busy: false,
        error: '',
        auth: event.auth,
      };
    }
  }
}
export function useOrderSearch(enabled = true) {
  const {traceability, session} = useAppServices();
  const auth = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [state, dispatch] = useReducer(reducer, {
    ...emptyResult,
    search: '',
    revision: 0,
    auth,
  });
  const requestGeneration = useRef(0);
  const loading = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const generation = ++requestGeneration.current;
    loading.current = true;
    const timer = setTimeout(() => {
      void traceability
        .listOrders(state.search)
        .then(result => {
          if (
            requestGeneration.current === generation &&
            session.getSnapshot() === auth
          )
            dispatch({type: 'loaded', result, page: 1, auth});
        })
        .catch(error => {
          if (
            requestGeneration.current === generation &&
            session.getSnapshot() === auth
          )
            dispatch({
              type: 'failed',
              error:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível carregar os pedidos.',
              auth,
            });
        })
        .finally(() => {
          if (requestGeneration.current === generation) loading.current = false;
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      requestGeneration.current = generation + 1;
    };
  }, [state.search, state.revision, traceability, session, auth, enabled]);
  async function loadMore() {
    if (loading.current || state.auth !== auth) return;
    const generation = requestGeneration.current;
    const page = state.page + 1;
    loading.current = true;
    dispatch({type: 'loading-more'});
    try {
      const result = await traceability.listOrders(state.search, page);
      if (
        requestGeneration.current === generation &&
        session.getSnapshot() === auth
      )
        dispatch({type: 'loaded', result, page, auth});
    } catch (error) {
      if (
        requestGeneration.current === generation &&
        session.getSnapshot() === auth
      )
        dispatch({
          type: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar mais pedidos.',
          auth,
        });
    } finally {
      if (requestGeneration.current === generation) loading.current = false;
    }
  }
  return {
    ...state,
    ...(state.auth === auth ? {} : emptyResult),
    loadMore,
    setSearch: (search: string) => dispatch({type: 'search', search}),
    retry: () => dispatch({type: 'retry'}),
  };
}
