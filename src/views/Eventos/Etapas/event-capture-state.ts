import type {EnumTipoEvento} from '../../../domain/enums/tipoEvento';
import type {Reading} from '../../../domain/traceability/reading';
import type {CaptureOwner} from '../../../domain/offline/owner';
import type {Attempt} from '../../../domain/experimentation/attempt';

export interface CaptureIntent {
  id: string;
  occurredAt: string;
  owner: CaptureOwner;
  reading: Reading;
  attempt?: Attempt | null;
}
export type EventCaptureState = {message: string} & (
  | {stage: 'select'; type?: undefined; intent?: undefined; savedId?: undefined}
  | {
      stage: 'scan';
      type: EnumTipoEvento;
      intent?: undefined;
      savedId?: undefined;
    }
  | {
      stage: 'review' | 'saving';
      type: EnumTipoEvento;
      intent: CaptureIntent;
      savedId?: undefined;
    }
  | {
      stage: 'saved';
      type: EnumTipoEvento;
      intent: CaptureIntent;
      savedId: string;
    }
);
export type EventCaptureEvent =
  | {type: 'event-selected'; eventType?: EnumTipoEvento}
  | {type: 'captured'; intent: CaptureIntent}
  | {type: 'saving'}
  | {type: 'saved'; captureId: string}
  | {type: 'failed'; message: string}
  | {type: 'message'; message: string}
  | {type: 'rescan'}
  | {type: 'reset'};
export const initialEventCaptureState: EventCaptureState = {
  stage: 'select',
  message: '',
};
export function eventCaptureReducer(
  state: EventCaptureState,
  event: EventCaptureEvent,
): EventCaptureState {
  switch (event.type) {
    case 'event-selected':
      return event.eventType === undefined
        ? initialEventCaptureState
        : {stage: 'scan', type: event.eventType, message: ''};
    case 'captured':
      return state.type === undefined
        ? state
        : {
            stage: 'review',
            type: state.type,
            intent: event.intent,
            message: '',
          };
    case 'saving':
      return state.stage === 'review'
        ? {...state, stage: 'saving', message: ''}
        : state;
    case 'saved':
      return state.stage === 'saving'
        ? {...state, stage: 'saved', savedId: event.captureId}
        : state;
    case 'failed':
      return state.stage === 'saving'
        ? {...state, stage: 'review', message: event.message}
        : {...state, message: event.message};
    case 'message':
      return {...state, message: event.message};
    case 'rescan':
      return state.type === undefined
        ? initialEventCaptureState
        : {stage: 'scan', type: state.type, message: ''};
    case 'reset':
      return initialEventCaptureState;
  }
}
