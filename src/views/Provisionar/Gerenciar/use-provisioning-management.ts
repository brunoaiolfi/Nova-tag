import {showCommandFailure} from '../../../components/Base/Toast/service';
import {useCallback, useMemo, useReducer, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useAppServices} from '../../../components/Services/AppServicesProvider';
import {useSession} from '../../../components/Auth/SessionProvider';
import {sameSessionIdentity} from '../../../domain/auth/session-identity';
import {managementReducer, initialManagementState} from './management-state';
import type {ProvisioningSelection} from './management-state';

export function useProvisioningManagement(provisioningId?: string) {
  const {traceability, session, nfc} = useAppServices();
  const {state: auth} = useSession();
  const canManage =
    auth.status === 'authenticated' &&
    auth.session.user.perfil === 'ADMINISTRADOR';
  const sessionScope = auth.session
    ? [auth.session.baseUrl, auth.session.user.id, auth.session.token].join(
        '\u0000',
      )
    : auth.status;
  const [state, dispatch] = useReducer(managementReducer, undefined, () =>
    initialManagementState(provisioningId, sessionScope),
  );
  if (
    state.routeProvisioningId !== provisioningId ||
    state.sessionScope !== sessionScope
  )
    dispatch({type: 'route-changed', provisioningId, sessionScope});
  const {selection, scanning, revision} = state;
  const generation = useRef(0);
  const closing = useRef(false);
  const managementQuery = useMemo(
    () => ({selection, scanning, revision, sessionScope}),
    [selection, scanning, revision, sessionScope],
  );
  useFocusEffect(
    useCallback(() => {
      const {selection: requestedSelection, scanning: isScanning} =
        managementQuery;
      const requestGeneration = ++generation.current;
      if (!requestedSelection || !canManage || isScanning) return;
      const identity = session.getSnapshot().session;
      const isCurrentRequest = () =>
        requestGeneration === generation.current &&
        sameSessionIdentity(identity, session.getSnapshot().session);
      dispatch({type: 'loading'});
      async function load() {
        try {
          const provisioning =
            'id' in requestedSelection!
              ? await traceability.provisioning(requestedSelection!.id)
              : await traceability.tag(requestedSelection!.reading.uid);
          if (!isCurrentRequest()) return;
          if (!provisioning) {
            dispatch({
              type: 'failed',
              message:
                'Esta etiqueta ainda não possui vínculo. Você pode vinculá-la a um pedido pela aba Vincular.',
            });
            return;
          }
          const order = await traceability.order(provisioning.pedidoId);
          if (isCurrentRequest())
            dispatch({type: 'loaded', context: {provisioning, order}});
        } catch (error) {
          if (isCurrentRequest())
            dispatch({
              type: 'failed',
              message:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível consultar o vínculo.',
            });
        }
      }
      load().catch(showCommandFailure);
      return () => {
        generation.current = requestGeneration + 1;
      };
    }, [managementQuery, canManage, session, traceability]),
  );
  async function close() {
    if (
      !state.context ||
      !canManage ||
      !auth.session ||
      state.confirmation !== 'checked' ||
      closing.current ||
      state.task !== 'idle'
    )
      return;
    const requestGeneration = generation.current;
    const identity = session.getSnapshot().session;
    const isCurrentRequest = () =>
      requestGeneration === generation.current &&
      sameSessionIdentity(identity, session.getSnapshot().session);
    closing.current = true;
    dispatch({type: 'closing'});
    try {
      const provisioning = await traceability.closeProvisioning(
        state.context.provisioning,
        auth.session.user.id,
      );
      if (isCurrentRequest()) dispatch({type: 'closed', provisioning});
    } catch (error) {
      if (isCurrentRequest())
        dispatch({
          type: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'Encerramento não confirmado. Consulte ou tente novamente.',
        });
    } finally {
      closing.current = false;
    }
  }
  return {
    ...state,
    canManage,
    physicalNfcAvailable: nfc.physicalNfcAvailable,
    busy: state.task !== 'idle',
    confirmed: state.confirmation === 'checked',
    confirming: state.confirmation !== 'hidden',
    close,
    select: (selectedProvisioning: ProvisioningSelection) =>
      dispatch({type: 'selected', selection: selectedProvisioning}),
    setScanning: (isScanning: boolean) =>
      dispatch({type: 'scan', scanning: isScanning}),
    requestClosure: () => dispatch({type: 'request-closure'}),
    cancelClosure: () => dispatch({type: 'cancel-closure'}),
    toggleConfirmation: () => dispatch({type: 'toggle-confirmation'}),
    reload: () => dispatch({type: 'reload'}),
  };
}
