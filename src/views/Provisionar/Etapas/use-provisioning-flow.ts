import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useSyncExternalStore,
} from 'react';
import {NavigationContext} from '@react-navigation/native';
import {useAppServices} from '../../../components/Services/AppServicesProvider';
import {
  provisioningReducer,
  initialProvisioningState,
} from './provisioning-state';
import type {ProvisioningEvent, ProvisioningState} from './provisioning-state';
import type {Session} from '../../../domain/auth/session';
import {sameSessionIdentity} from '../../../domain/auth/session-identity';
import type {Reading, Strategy} from '../../../domain/traceability/reading';
import type {Provisioning} from '../../../domain/traceability/provisioning';
import type {OrderSummary} from '../../../appplication/traceability/contracts/order.types';

function verifiedEvidence(
  strategy: Strategy,
  reading?: Reading,
  provisioning?: Provisioning,
): boolean {
  if (!reading || !provisioning || reading.uid !== provisioning.uid)
    return false;
  return strategy === 'UID'
    ? !reading.ndef?.startsWith('urn:nfc-trace:provisioning:')
    : reading.ndef === provisioning.referenciaNdef;
}
export function useProvisioningFlow(
  strategy: Strategy,
  expectedUid?: string,
  registeredModel?: string,
) {
  const {traceability, session} = useAppServices();
  const identity = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  ).session;
  const [snapshot, dispatchEvent] = useReducer(
    (
      previous: {identity?: Session; flow: ProvisioningState},
      update: {identity?: Session; event: ProvisioningEvent},
    ) => ({
      identity: update.identity,
      flow: provisioningReducer(
        sameSessionIdentity(previous.identity, update.identity)
          ? previous.flow
          : initialProvisioningState(registeredModel),
        update.event,
      ),
    }),
    {identity, flow: initialProvisioningState(registeredModel)},
  );
  const state = sameSessionIdentity(snapshot.identity, identity)
    ? snapshot.flow
    : initialProvisioningState(registeredModel);
  const dispatch = (event: ProvisioningEvent) =>
    dispatchEvent({identity, event});
  const operationRunning = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    mounted.current = true;
    const stopBlurListener = navigation?.addListener('blur', () => {
      generation.current++;
    });
    return () => {
      mounted.current = false;
      stopBlurListener?.();
    };
  }, [navigation]);
  const {order, evidence, provisioning} = state.target;
  const reading = evidence?.reading;
  const verified = verifiedEvidence(strategy, reading, provisioning);
  function selectOrder(selectedOrder?: OrderSummary) {
    generation.current++;
    dispatch({type: 'order-selected', order: selectedOrder});
  }
  function capturedReading(capturedTag: Reading, capturedAt: string) {
    const targetUid = expectedUid ?? provisioning?.uid;
    if (targetUid && capturedTag.uid !== targetUid) {
      dispatch({type: 'mode-changed', mode: 'form'});
      dispatch({
        type: 'message',
        message: `Etiqueta ${capturedTag.uid} diferente. Leia a etiqueta ${targetUid}.`,
      });
      return;
    }
    generation.current++;
    dispatch({
      type: 'reading-captured',
      evidence: {reading: capturedTag, capturedAt},
    });
  }
  async function perform(task: 'registering' | 'activating') {
    if (!order || !reading || operationRunning.current || !mounted.current)
      return;
    if (!sameSessionIdentity(identity, session.getSnapshot().session)) return;
    if (
      task === 'activating' &&
      (!provisioning || !verified || !state.confirmed)
    )
      return;
    const requestGeneration = generation.current;
    const isCurrentOperation = () =>
      mounted.current &&
      requestGeneration === generation.current &&
      sameSessionIdentity(identity, session.getSnapshot().session);
    operationRunning.current = true;
    dispatch({type: 'started', task});
    try {
      const result =
        task === 'registering'
          ? await traceability.register(
              order.codigo,
              reading,
              strategy,
              state.model,
            )
          : await traceability.activate(
              provisioning!,
              reading,
              state.confirmed,
            );
      if (!isCurrentOperation()) return;
      dispatch({type: 'registered', provisioning: result});
      dispatch({
        type: 'settled',
        message:
          task === 'activating'
            ? 'Etiqueta ativa. Provisionamento registrado no histórico do pedido.'
            : result.status === 'ATIVA'
            ? 'Vínculo já ativo.'
            : 'Vínculo registrado. Confira a configuração física antes de ativar.',
      });
    } catch (error) {
      if (isCurrentOperation())
        dispatch({
          type: 'settled',
          message:
            error instanceof Error ? error.message : 'Operação não confirmada.',
        });
    } finally {
      operationRunning.current = false;
      if (
        mounted.current &&
        requestGeneration !== generation.current &&
        sameSessionIdentity(identity, session.getSnapshot().session)
      )
        dispatch({type: 'drained'});
    }
  }
  return {
    ...state,
    order,
    reading,
    capturedAt: evidence?.capturedAt,
    provisioning,
    verified,
    busy: state.task !== 'idle',
    selectOrder,
    capturedReading,
    setModel: (model: string) => dispatch({type: 'model-changed', model}),
    setMode: (mode: typeof state.mode) =>
      dispatch({type: 'mode-changed', mode}),
    setMessage: (message: string) => dispatch({type: 'message', message}),
    setConfirmed: (confirmed: boolean) =>
      dispatch({type: 'confirmation-changed', confirmed}),
    reset: () => {
      generation.current++;
      dispatch({type: 'reset', model: 'DESCONHECIDO'});
    },
    register: () => perform('registering'),
    activate: () => perform('activating'),
  };
}
