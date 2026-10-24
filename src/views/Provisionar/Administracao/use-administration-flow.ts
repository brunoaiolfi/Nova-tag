import {showCommandFailure} from '../../../components/Base/Toast/service';
import {useCallback, useEffect, useReducer, useRef} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppServices} from '../../../components/Services/AppServicesProvider';
import {useSession} from '../../../components/Auth/SessionProvider';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import type {
  AdminOperation,
  Material,
} from '../../../domain/administration/operation';
import {sameSessionIdentity} from '../../../domain/auth/session-identity';
import {
  administrationReducer,
  initialAdministrationState,
} from './administration-state';

function operationFailureMessage(error: unknown): string {
  if (!(error instanceof Error))
    return 'Operação não confirmada. Atualize a operação para recuperar.';
  const code =
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
      ? error.code
      : undefined;
  return error.message + (code ? ` Código: ${code}.` : '');
}
export function useAdministrationFlow(provisioningId?: string) {
  const {administration, traceability, nfc, session} = useAppServices();
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const {state: auth} = useSession();
  const canManage =
    auth.status === 'authenticated' &&
    auth.session.user.perfil === 'ADMINISTRADOR';
  const scope = auth.session
    ? [auth.session.baseUrl, auth.session.user.id, auth.session.token].join(
        '\u0000',
      )
    : auth.status;
  const [state, dispatch] = useReducer(
    administrationReducer,
    undefined,
    initialAdministrationState,
  );
  const scopeRef = useRef(scope);
  const requestedProvisioning = useRef(provisioningId);
  const generation = useRef(0);
  const working = useRef(false);
  const pendingRouteLoad = useRef<(() => void) | undefined>(undefined);
  // These refs hold the latest committed operation/identified tag for error recovery.
  // They are written by commands, never by render.
  const latestUid = useRef('');
  const latestOperation = useRef<AdminOperation | undefined>(undefined);
  const installOperation = useCallback(
    async (operation: AdminOperation, requestGeneration: number) => {
      const materials = await administration.suggestions(operation);
      const journal = await administration.localJournal(operation);
      const pendingActivation = await administration.activationPending(
        operation,
      );
      if (requestGeneration !== generation.current) return;
      latestOperation.current = operation;
      dispatch({
        type: 'operation-loaded',
        operation,
        materials,
        journal,
        pendingActivation,
      });
    },
    [administration],
  );
  const run = useCallback(
    async (
      label: string,
      work: (requestGeneration: number) => Promise<void>,
      usesNfc = false,
    ) => {
      if (
        working.current ||
        !canManage ||
        !nfc.physicalNfcAvailable ||
        scopeRef.current !== scope
      )
        return;
      const requestGeneration = generation.current;
      const identity = session.getSnapshot().session;
      const isCurrentOperation = () =>
        requestGeneration === generation.current &&
        sameSessionIdentity(identity, session.getSnapshot().session);
      working.current = true;
      dispatch({type: 'operation-started', label, nfc: usesNfc});
      try {
        await work(requestGeneration);
      } catch (error) {
        if (!isCurrentOperation()) return;
        dispatch({
          type: 'operation-failed',
          message: operationFailureMessage(error),
        });
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'NFC_ETIQUETA_EM_USO' &&
          latestUid.current
        ) {
          try {
            const previousOperation = await administration.pending(
              latestUid.current,
            );
            if (isCurrentOperation())
              dispatch({
                type: 'blocking-operation',
                operation: previousOperation,
              });
          } catch (lookupError) {
            if (isCurrentOperation())
              dispatch({
                type: 'lookup-failed',
                message:
                  lookupError instanceof Error
                    ? lookupError.message
                    : 'Não foi possível consultar a configuração anterior.',
              });
          }
        }
        const operation = latestOperation.current;
        if (operation && isCurrentOperation()) {
          try {
            await installOperation(
              await administration.refresh(operation.id),
              requestGeneration,
            );
          } catch {
            /* Preserve the last durable checkpoint while offline. */
          }
        }
      } finally {
        working.current = false;
        dispatch({
          type: isCurrentOperation()
            ? 'operation-finished'
            : 'previous-operation-finished',
        });
        const reloadCurrentRoute = pendingRouteLoad.current;
        pendingRouteLoad.current = undefined;
        reloadCurrentRoute?.();
      }
    },
    [
      canManage,
      nfc.physicalNfcAvailable,
      scope,
      session,
      administration,
      installOperation,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      const requestGeneration = ++generation.current;
      if (
        scopeRef.current !== scope ||
        requestedProvisioning.current !== provisioningId
      ) {
        scopeRef.current = scope;
        requestedProvisioning.current = provisioningId;
        latestUid.current = '';
        latestOperation.current = undefined;
        dispatch({type: 'scope-reset'});
      }
      dispatch({type: 'resumed', waiting: working.current});
      if (!canManage) void administration.cancel().catch(() => {});
      if (provisioningId && canManage) {
        const loadRequestedPlan = () => {
          run('Consultando o plano', async () => {
            const provisioning = await traceability.provisioning(
              provisioningId,
            );
            if (requestGeneration !== generation.current) return;
            const order = await traceability.order(provisioning.pedidoId);
            if (requestGeneration !== generation.current) return;
            latestUid.current = provisioning.uid;
            dispatch({type: 'plan-loaded', link: provisioning, order});
            await installOperation(
              await administration.prepare(provisioning),
              requestGeneration,
            );
          }).catch(showCommandFailure);
        };
        if (working.current) pendingRouteLoad.current = loadRequestedPlan;
        else loadRequestedPlan();
      }
      return () => {
        generation.current = requestGeneration + 1;
        pendingRouteLoad.current = undefined;
        void administration.cancel().catch(() => {});
      };
    }, [
      scope,
      canManage,
      administration,
      provisioningId,
      run,
      traceability,
      installOperation,
    ]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', appState => {
      // iOS NFC sheets report inactive; only background ends the RF session.
      if (appState === 'background')
        void administration.cancel().catch(() => {});
    });
    return () => subscription.remove();
  }, [administration]);

  async function identify(requestGeneration: number) {
    const tag = await nfc.identifyAdministrativeTag();
    if (requestGeneration !== generation.current) return;
    latestUid.current = tag.uid;
    dispatch({type: 'tag-identified', uid: tag.uid});
  }
  async function prepare(requestGeneration: number) {
    if (!state.order || !state.uid || !state.strategy) return;
    const provisioning =
      state.link ??
      (await administration.register(
        state.order.id,
        state.uid,
        state.strategy,
        state.policy,
      ));
    if (requestGeneration !== generation.current) return;
    dispatch({type: 'link-loaded', link: provisioning});
    await installOperation(
      await administration.prepare(provisioning),
      requestGeneration,
    );
  }
  async function refresh(requestGeneration: number) {
    if (!state.operation) return;
    const operation = await administration.restore(
      await administration.refresh(state.operation.id),
    );
    if (requestGeneration !== generation.current) return;
    await installOperation(operation, requestGeneration);
    if (state.link) {
      const provisioning = await traceability.provisioning(state.link.id);
      if (requestGeneration === generation.current)
        dispatch({type: 'link-loaded', link: provisioning});
    }
  }
  async function execute(requestGeneration: number) {
    if (
      !state.operation ||
      !state.confirmed ||
      state.materials.length !== 5 ||
      state.materials.some(material => material === null)
    )
      return;
    const operation = await administration.execute(
      state.operation,
      state.materials.map((material): Material => {
        if (material === null)
          throw new Error(
            'Confira o material de todas as chaves antes de continuar.',
          );
        return material;
      }),
      progress => {
        if (requestGeneration === generation.current)
          dispatch({type: 'progress', progress});
      },
    );
    await installOperation(operation, requestGeneration);
  }
  async function activate(requestGeneration: number) {
    if (!state.operation || !state.link || !state.activationConfirmed) return;
    const provisioning = await administration.activate(
      state.operation,
      state.link,
      true,
    );
    if (requestGeneration === generation.current)
      dispatch({type: 'activation-completed', link: provisioning});
  }
  async function end(requestGeneration: number) {
    if (!state.operation) return;
    await installOperation(
      await administration.end(state.operation),
      requestGeneration,
    );
  }
  async function resolvePending(requestGeneration: number) {
    const previousOperation =
      state.blockingOperation ?? (await administration.pending(state.uid));
    if (requestGeneration !== generation.current) return;
    if (!state.blockingOperation) {
      dispatch({type: 'blocking-operation', operation: previousOperation});
      dispatch({
        type: 'operation-failed',
        message:
          'Encerre a configuração anterior. Código: NFC_ETIQUETA_EM_USO.',
      });
      return;
    }
    if (previousOperation.alteracaoEmitida) {
      navigation.navigate('Administracao', {
        provisioningId: previousOperation.plano.provisionamentoId,
      });
      return;
    }
    await administration.end(previousOperation);
    if (requestGeneration === generation.current)
      await prepare(requestGeneration);
  }
  return {
    ...state,
    canManage,
    physicalNfcAvailable: nfc.physicalNfcAvailable,
    busy: state.activity?.label ?? '',
    run,
    identify,
    prepare,
    refresh,
    execute,
    activate,
    end,
    resolvePending,
    dispatch,
    cancel: () => administration.cancel().catch(() => {}),
  };
}
