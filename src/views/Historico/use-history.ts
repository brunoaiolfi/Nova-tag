import {showCommandFailure} from '../../components/Base/Toast/service';
import {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useAppServices} from '../../components/Services/AppServicesProvider';
import {useSession} from '../../components/Auth/SessionProvider';
import {sameSessionIdentity} from '../../domain/auth/session-identity';
import type {Reading} from '../../domain/traceability/reading';
import {historyReducer, initialHistoryState} from './history-state';
import type {HistoryTarget} from './history-state';

export function useHistory(
  routeReading: Reading | undefined,
  consumeRouteReading: () => void,
) {
  const {traceability, session} = useAppServices();
  const {state: auth} = useSession();
  const sessionScope = auth.session
    ? [auth.session.user.id, auth.session.baseUrl, auth.session.token].join(
        '\u0000',
      )
    : auth.status;
  const [state, dispatch] = useReducer(historyReducer, undefined, () =>
    initialHistoryState(routeReading, sessionScope),
  );
  if (state.sessionScope !== sessionScope)
    dispatch({type: 'session-changed', reading: routeReading, sessionScope});
  // Adjust this component's own selection before children commit a changed route.
  if (routeReading && routeReading !== state.receivedReading)
    dispatch({type: 'route-reading', reading: routeReading});
  useEffect(() => {
    if (routeReading) consumeRouteReading();
  }, [routeReading, consumeRouteReading]);
  const generation = useRef(0);
  const running = useRef(false);
  const {target, scanning, scope, revision} = state;
  const historyQuery = useMemo(
    () => ({target, scanning, scope, revision, sessionScope}),
    [target, scanning, scope, revision, sessionScope],
  );
  useFocusEffect(
    useCallback(() => {
      const {
        target: requestedTarget,
        scope: requestedScope,
        scanning: isScanning,
      } = historyQuery;
      const requestGeneration = ++generation.current;
      if (!requestedTarget || isScanning || auth.status !== 'authenticated')
        return;
      const identity = session.getSnapshot().session;
      const isCurrentRequest = () =>
        requestGeneration === generation.current &&
        sameSessionIdentity(identity, session.getSnapshot().session);
      running.current = true;
      dispatch({type: 'loading'});
      async function load() {
        try {
          let provisioning =
            requestedTarget!.kind === 'tag'
              ? await traceability.resolveProvisioning(requestedTarget!.reading)
              : undefined;
          if (!isCurrentRequest()) return;
          const order = await traceability.order(
            requestedTarget!.kind === 'tag'
              ? provisioning!.pedidoId
              : requestedTarget!.order.id,
          );
          if (!isCurrentRequest()) return;
          if (requestedTarget!.kind === 'order')
            provisioning = order.provisionamentoVigente ?? undefined;
          const history = await traceability.history(
            order.id,
            1,
            requestedScope === 'vinculo' ? provisioning?.id : undefined,
          );
          if (isCurrentRequest())
            dispatch({type: 'loaded', context: {order, provisioning}, history});
        } catch (error) {
          if (isCurrentRequest())
            dispatch({
              type: 'failed',
              message:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível carregar o histórico.',
            });
        } finally {
          if (requestGeneration === generation.current) running.current = false;
        }
      }
      load().catch(showCommandFailure);
      return () => {
        generation.current = requestGeneration + 1;
      };
    }, [historyQuery, auth.status, session, traceability]),
  );
  async function more() {
    if (!state.context || state.nextPage === null || running.current) return;
    const requestGeneration = generation.current;
    const identity = session.getSnapshot().session;
    const isCurrentRequest = () =>
      requestGeneration === generation.current &&
      sameSessionIdentity(identity, session.getSnapshot().session);
    running.current = true;
    dispatch({type: 'loading-more'});
    try {
      const history = await traceability.history(
        state.context.order.id,
        state.nextPage,
        scope === 'vinculo' ? state.context.provisioning?.id : undefined,
      );
      if (isCurrentRequest()) dispatch({type: 'more-loaded', history});
    } catch (error) {
      if (isCurrentRequest())
        dispatch({
          type: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar mais registros.',
        });
    } finally {
      if (requestGeneration === generation.current) running.current = false;
    }
  }
  return {
    ...state,
    auth,
    more,
    choose: (selectedTarget?: HistoryTarget) => {
      generation.current++;
      dispatch({type: 'selected', target: selectedTarget});
    },
    setScanning: (isScanning: boolean) =>
      dispatch({type: 'scan', scanning: isScanning}),
    setScope: (selectedScope: string) => {
      if (selectedScope === 'pedido' || selectedScope === 'vinculo')
        dispatch({type: 'scope', scope: selectedScope});
    },
    reload: () => dispatch({type: 'reload'}),
  };
}
