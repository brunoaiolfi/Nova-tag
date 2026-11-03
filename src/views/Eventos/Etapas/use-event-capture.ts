import {showCommandFailure} from '../../../components/Base/Toast/service';
import {useEffect, useReducer, useRef} from 'react';
import {useAppServices} from '../../../components/Services/AppServicesProvider';
import {useOffline} from '../../../components/Offline/OfflineProvider';
import {useSessionScope} from '../../../components/Auth/use-session-scope';
import {sameSessionIdentity} from '../../../domain/auth/session-identity';
import type {Reading} from '../../../domain/traceability/reading';
import type {Attempt} from '../../../domain/experimentation/attempt';
import {
  eventCaptureReducer,
  initialEventCaptureState,
} from './event-capture-state';
import type {EventCaptureState, EventCaptureEvent} from './event-capture-state';

export function useEventCapture() {
  const {session, installationId, randomUUID} = useAppServices();
  const queue = useOffline();
  const sessionScope = useSessionScope(session);
  const [snapshot, dispatchEvent] = useReducer(
    (
      previous: {sessionScope: string; state: EventCaptureState},
      update: {sessionScope: string; event: EventCaptureEvent},
    ) => ({
      sessionScope: update.sessionScope,
      state: eventCaptureReducer(
        previous.sessionScope === update.sessionScope
          ? previous.state
          : initialEventCaptureState,
        update.event,
      ),
    }),
    {sessionScope, state: initialEventCaptureState},
  );
  const state =
    snapshot.sessionScope === sessionScope
      ? snapshot.state
      : initialEventCaptureState;
  const dispatch = (event: EventCaptureEvent) =>
    dispatchEvent({sessionScope, event});
  const running = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function captured(
    reading: Reading,
    capturedAt: string,
    attempt?: Attempt | null,
  ) {
    const identity = session.getSnapshot().session;
    if (!identity) {
      dispatch({
        type: 'message',
        message: 'Entre novamente para registrar a captura.',
      });
      return;
    }
    dispatch({
      type: 'captured',
      intent: {
        id: randomUUID(),
        occurredAt: capturedAt,
        owner: {userId: identity.user.id, baseUrl: identity.baseUrl},
        attempt,
        reading: {
          ...reading,
          ...(reading.tecnologias
            ? {tecnologias: [...reading.tecnologias]}
            : {}),
        },
      },
    });
  }
  async function save() {
    if (state.stage !== 'review' || running.current) return;
    const intent = state.intent;
    const identity = session.getSnapshot().session;
    const isCurrentIdentity = () =>
      mounted.current &&
      sameSessionIdentity(identity, session.getSnapshot().session);
    running.current = true;
    dispatch({type: 'saving'});
    try {
      const device = await installationId();
      const capture = await queue.manager.capture(
        intent.reading,
        state.type,
        intent.id,
        intent.occurredAt,
        device,
        intent.owner,
        intent.attempt,
      );
      if (isCurrentIdentity()) {
        dispatch({type: 'saved', captureId: capture.id});
        queue.manager.synchronize().catch(showCommandFailure);
      }
    } catch (error) {
      if (isCurrentIdentity())
        dispatch({
          type: 'failed',
          message:
            (error instanceof Error ? error.message : 'Falha ao salvar.') +
            ' A captura só estará confirmada depois de ser salva neste aparelho.',
        });
    } finally {
      running.current = false;
    }
  }
  return {
    ...state,
    queue,
    busy: state.stage === 'saving',
    reading: state.intent?.reading,
    capturedAt: state.intent?.occurredAt,
    saved: queue.items.find(item => item.id === state.savedId),
    captured,
    save,
    dispatch,
  };
}
