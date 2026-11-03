import {useCallback, useReducer, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useAppServices} from '../Services/AppServicesProvider';
import {useSession} from '../Auth/SessionProvider';
import {useOffline} from './OfflineProvider';
import {sameSessionIdentity} from '../../domain/auth/session-identity';
import type {ExperimentPlan} from '../../domain/experimentation/plan';
import type {ExperimentRun} from '../../appplication/experimentation/catalog.types';
import {
  experimentPanelReducer,
  initialExperimentPanelState,
} from './experiment-panel-state';
import type {ExperimentTaskResult} from './experiment-panel-state';

export function useExperimentPanel() {
  const {installationId, experimentCatalog, session} = useAppServices();
  const {state: auth} = useSession();
  const queue = useOffline();
  const journal = queue.manager.experiment;
  const owner = auth.session;
  const permitted = !!owner && owner.user.perfil !== 'CONSULTA';
  const [snapshot, dispatch] = useReducer(
    experimentPanelReducer,
    owner,
    initialExperimentPanelState,
  );
  const panelState = sameSessionIdentity(snapshot.owner, owner)
    ? snapshot
    : initialExperimentPanelState(owner);
  const generation = useRef(0);
  const isActive = useRef(false);
  const commandRunning = useRef(false);
  useFocusEffect(
    useCallback(() => {
      isActive.current = true;
      const requestGeneration = ++generation.current;
      const isCurrentRequest = () =>
        isActive.current &&
        requestGeneration === generation.current &&
        sameSessionIdentity(owner, session.getSnapshot().session);
      if (permitted && journal) {
        void Promise.all([installationId(), journal.state()])
          .then(([device, selectionState]) => {
            if (isCurrentRequest())
              dispatch({
                type: 'initialized',
                owner,
                device,
                selectionState,
                commandRunning: commandRunning.current,
              });
          })
          .catch(error => {
            if (isCurrentRequest())
              dispatch({
                type: 'failed',
                owner,
                message:
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível abrir o ensaio.',
              });
          });
      }
      return () => {
        isActive.current = false;
      };
    }, [permitted, owner, journal, installationId, session]),
  );

  async function executeTask(
    work: (isCurrentRequest: () => boolean) => Promise<ExperimentTaskResult>,
    kind: 'query' | 'command' = 'query',
  ) {
    if (
      !permitted ||
      !owner ||
      !journal ||
      !isActive.current ||
      commandRunning.current ||
      !sameSessionIdentity(owner, session.getSnapshot().session)
    )
      return;
    const requestGeneration = ++generation.current;
    const isCurrentRequest = () =>
      isActive.current &&
      requestGeneration === generation.current &&
      sameSessionIdentity(owner, session.getSnapshot().session);
    if (kind === 'command') commandRunning.current = true;
    dispatch({type: 'started', owner});
    try {
      const result = await work(isCurrentRequest);
      if (!isCurrentRequest()) return;
      const selectionState = await journal.state();
      if (isCurrentRequest())
        dispatch({type: 'completed', owner, result, selectionState});
    } catch (error) {
      if (isCurrentRequest())
        dispatch({
          type: 'failed',
          owner,
          message:
            error instanceof Error
              ? error.message
              : 'Operação experimental não confirmada.',
        });
    } finally {
      if (kind === 'command') {
        commandRunning.current = false;
        if (
          isActive.current &&
          sameSessionIdentity(owner, session.getSnapshot().session)
        )
          dispatch({type: 'command-drained', owner});
      }
    }
  }
  async function loadRuns(page = 1) {
    await executeTask(async () => ({
      kind: 'runs',
      page: await experimentCatalog.runs(
        {userId: owner!.user.id, baseUrl: owner!.baseUrl},
        page,
      ),
    }));
  }
  async function loadPlans(run: ExperimentRun, page = 1) {
    await executeTask(async () => {
      const device = panelState.device || (await installationId());
      const result = await experimentCatalog.plans(
        {userId: owner!.user.id, baseUrl: owner!.baseUrl},
        run,
        device,
        page,
      );
      return {kind: 'plans', run, device, page: result};
    });
  }
  async function select(plan: ExperimentPlan | null) {
    await executeTask(async () => {
      await journal!.select(
        plan,
        !!plan && plan.scenario !== 'LEGITIMO_ONLINE',
      );
      return {
        kind: 'command',
        message: plan
          ? `Roteiro selecionado. Abra Registrar etapa e escolha ${plan.eventType}.`
          : '',
      };
    }, 'command');
  }
  async function release() {
    await executeTask(async isCurrentRequest => {
      await journal!.release(queue.items);
      if (isCurrentRequest()) await queue.manager.synchronize(true);
      if (isCurrentRequest()) await queue.manager.refreshDecisions();
      if (isCurrentRequest()) await journal!.flush();
      return {kind: 'command'};
    }, 'command');
  }
  return {
    ...panelState,
    available: !!journal && permitted,
    online: auth.status === 'authenticated',
    syncing: queue.syncing,
    loadRuns,
    loadPlans,
    select,
    release,
    refresh: () =>
      executeTask(async () => {
        await journal!.flush();
        return {kind: 'command'};
      }, 'command'),
  };
}
