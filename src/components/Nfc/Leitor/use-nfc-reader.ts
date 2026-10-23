import {useCallback, useContext, useEffect, useReducer, useRef} from 'react';
import {AppState} from 'react-native';
import {NavigationContext} from '@react-navigation/native';
import {useAppServices} from '../../Services/AppServicesProvider';
import {startPhysicalReading} from '../../../appplication/nfc/physical-reading';
import type {
  PhysicalReadingResult,
  PhysicalReadingTask,
} from '../../../appplication/nfc/physical-reading';

type ReaderState = {message: string} & (
  | {status: 'idle' | 'reading' | 'cancelled' | 'failed'; result?: undefined}
  | {status: 'read'; result: PhysicalReadingResult}
);
type ReaderEvent =
  | {type: 'start'}
  | {type: 'read'; result: PhysicalReadingResult}
  | {type: 'failed'; message: string}
  | {type: 'cancel'}
  | {type: 'cancelled'};
function reducer(state: ReaderState, event: ReaderEvent): ReaderState {
  switch (event.type) {
    case 'start':
      return {status: 'reading', message: ''};
    case 'read':
      return {status: 'read', result: event.result, message: ''};
    case 'failed':
      return {status: 'failed', message: event.message};
    case 'cancel':
      return {
        status: 'cancelled',
        message:
          'Leitura cancelada. Toque em Ler etiqueta para tentar novamente.',
      };
    case 'cancelled':
      return {...state, status: 'idle', result: undefined};
  }
}
export function useNfcReader(
  options: {write?: {uid: string; reference: string}; experimentType?: string},
  onError: (message: string) => void,
) {
  const {nfc, experiment} = useAppServices();
  const navigation = useContext(NavigationContext);
  const [state, dispatch] = useReducer(reducer, {status: 'idle', message: ''});
  const mounted = useRef(false);
  const activeTask = useRef<PhysicalReadingTask | null>(null);
  const cancel = useCallback(() => {
    const task = activeTask.current;
    if (task) task.cancel();
    else void nfc.cancelPhysicalRead().catch(() => {});
  }, [nfc]);
  useEffect(() => {
    mounted.current = true;
    const stopBlurListener = navigation?.addListener('blur', cancel);
    const subscription = AppState.addEventListener('change', appState => {
      if (appState === 'background') cancel();
    });
    return () => {
      mounted.current = false;
      stopBlurListener?.();
      subscription.remove();
      cancel();
    };
  }, [navigation, cancel, nfc]);
  async function read() {
    if (activeTask.current || !mounted.current) return;
    const task = startPhysicalReading(nfc, experiment, options);
    activeTask.current = task;
    dispatch({type: 'start'});
    try {
      const result = await task.result;
      if (mounted.current && !task.isCancelled())
        dispatch({type: 'read', result});
    } catch (error) {
      if (mounted.current && !task.isCancelled()) {
        const message =
          error instanceof Error
            ? error.message
            : 'Leitura cancelada ou etiqueta não compatível. Tente novamente.';
        dispatch({type: 'failed', message});
        onError(message);
      }
    } finally {
      activeTask.current = null;
      if (mounted.current && task.isCancelled()) dispatch({type: 'cancelled'});
    }
  }
  return {
    ...state,
    busy: state.status === 'reading' || state.status === 'cancelled',
    physicalNfcAvailable: nfc.physicalNfcAvailable,
    read,
    cancelReading: () => {
      cancel();
      dispatch({type: 'cancel'});
    },
  };
}
