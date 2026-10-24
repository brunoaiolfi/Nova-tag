import type {Session} from '../../domain/auth/session';
import {sameSessionIdentity} from '../../domain/auth/session-identity';
import type {ExperimentPlan} from '../../domain/experimentation/plan';
import type {
  ExperimentRun,
  CatalogPage,
  PlanPage,
} from '../../appplication/experimentation/catalog.types';
import type {ExperimentJournal} from '../../appplication/experimentation/journal';

export type ExperimentSelectionState = Awaited<
  ReturnType<ExperimentJournal['state']>
>;
export interface ExperimentPanelState {
  owner?: Session | undefined;
  device: string;
  selectionState: ExperimentSelectionState;
  runs: ExperimentRun[];
  run?: ExperimentRun | undefined;
  plans: ExperimentPlan[];
  page: number;
  total: number;
  busy: boolean;
  message: string;
}
export type ExperimentTaskResult =
  | {kind: 'runs'; page: CatalogPage<ExperimentRun>}
  | {kind: 'plans'; run: ExperimentRun; device: string; page: PlanPage}
  | {kind: 'command'; message?: string | undefined};
export type ExperimentPanelEvent = {owner?: Session | undefined} & (
  | {
      type: 'initialized';
      device: string;
      selectionState: ExperimentSelectionState;
      commandRunning: boolean;
    }
  | {type: 'started'}
  | {
      type: 'completed';
      result: ExperimentTaskResult;
      selectionState: ExperimentSelectionState;
    }
  | {type: 'failed'; message: string}
  | {type: 'command-drained'}
);
export function initialExperimentPanelState(
  owner?: Session,
): ExperimentPanelState {
  return {
    owner,
    device: '',
    selectionState: {plan: null, hold: false, pending: 0, sent: 0, failed: 0},
    runs: [],
    plans: [],
    page: 1,
    total: 0,
    busy: false,
    message: '',
  };
}
export function experimentPanelReducer(
  previous: ExperimentPanelState,
  event: ExperimentPanelEvent,
): ExperimentPanelState {
  const state = sameSessionIdentity(previous.owner, event.owner)
    ? previous
    : initialExperimentPanelState(event.owner);
  switch (event.type) {
    case 'initialized':
      return {
        ...state,
        device: event.device,
        selectionState: event.selectionState,
        busy: event.commandRunning,
      };
    case 'started':
      return {...state, busy: true, message: ''};
    case 'failed':
      return {...state, busy: false, message: event.message};
    case 'command-drained':
      return {...state, busy: false};
    case 'completed': {
      const completed = {
        ...state,
        selectionState: event.selectionState,
        busy: false,
      };
      switch (event.result.kind) {
        case 'runs':
          return {
            ...completed,
            runs: event.result.page.items,
            plans: [],
            run: undefined,
            page: event.result.page.page,
            total: event.result.page.total,
          };
        case 'plans':
          return {
            ...completed,
            run: event.result.run,
            device: event.result.device,
            plans: event.result.page.items,
            page: event.result.page.page,
            total: event.result.page.total,
          };
        case 'command':
          return {...completed, message: event.result.message ?? ''};
      }
    }
  }
}
