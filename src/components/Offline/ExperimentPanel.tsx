import React, {useEffect, useState} from 'react';
import {List, Text} from 'react-native-paper';
import {ActionButton as Button, StatusPanel} from '../Tracking';
import VStack from '../Base/VStack';
import {useSession} from '../Auth/SessionProvider';
import {useOffline} from './OfflineProvider';
import {installationId} from '../../infra/traceability/runtime';
import type {ExperimentPlan} from '../../domain/experimentation/types';
type Run = {
  id: string;
  name: string;
  dataKind: string;
  configuration: {timeoutMs: number};
};
type Page<T> = {items: {input: T}[]; total: number};
export function ExperimentPanel() {
  const {manager: session, state} = useSession();
  const queue = useOffline();
  const journal = queue.manager.experiment;
  const [choice, setChoice] = useState<{
    plan: ExperimentPlan | null;
    hold: boolean;
    pending: number;
    sent: number;
    failed: number;
  }>({plan: null, hold: false, pending: 0, sent: 0, failed: 0});
  const [device, setDevice] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [run, setRun] = useState<Run>();
  const [plans, setPlans] = useState<ExperimentPlan[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const owner = state.session;
  const permitted = !!owner && owner.user.perfil !== 'CONSULTA';
  async function refresh() {
    if (journal) setChoice(await journal.state());
  }
  useEffect(() => {
    setRuns([]);
    setPlans([]);
    setRun(undefined);
    setMessage('');
    setChoice({plan: null, hold: false, pending: 0, sent: 0, failed: 0});
    if (permitted) {
      void installationId().then(setDevice);
      void refresh().catch(() => {});
    }
  }, [owner?.user.id, owner?.baseUrl, permitted]); // eslint-disable-line react-hooks/exhaustive-deps
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await work();
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadRuns(next = 1) {
    const result = await session.request<Page<Run>>(
      '/experimentos?pagina=' + next + '&limite=20',
      {expectedUserId: owner!.user.id, expectedBaseUrl: owner!.baseUrl},
    );
    setRuns(result.items.map(r => r.input));
    setRun(undefined);
    setPlans([]);
    setPage(next);
    setTotal(result.total);
  }
  async function loadPlans(selected: Run, next = 1) {
    const result = await session.request<Page<ExperimentPlan>>(
      '/experimentos/' +
        selected.id +
        '/tentativas?pagina=' +
        next +
        '&limite=20',
      {expectedUserId: owner!.user.id, expectedBaseUrl: owner!.baseUrl},
    );
    setPlans(
      result.items
        .map(t => ({...t.input, timeoutMs: selected.configuration.timeoutMs}))
        .filter(p => p.deviceId === device && p.mode === 'LEITURA_FISICA'),
    );
    setRun(selected);
    setPage(next);
    setTotal(result.total);
  }
  if (!journal || !permitted) return null;
  return (
    <List.Accordion
      title="Ensaio do TCC"
      description={
        choice.plan
          ? 'Roteiro selecionado · ' + choice.plan.tagLabel
          : 'Opcional · seguir um roteiro cadastrado'
      }>
      <VStack gap={12}>
        <Text>
          Cadastre a execução e as tentativas na API com um administrador.
          Selecione o roteiro deste aparelho; depois faça a leitura em Registrar
          etapa. A avaliação do observador é registrada separadamente.
        </Text>
        <Text selectable>Identificador deste aparelho: {device}</Text>
        <Text>
          {choice.pending} estágios aguardando envio · {choice.sent} confirmados
          · {choice.failed} recusados
        </Text>
        {!!choice.failed && (
          <Text accessibilityRole="alert">
            Há estágios recusados. Eles continuam no aparelho; confira a
            configuração e a exportação com o responsável pelo ensaio.
          </Text>
        )}
        {choice.plan && (
          <StatusPanel tone={choice.hold ? 'warning' : 'info'}>
            <Text variant="titleMedium">
              {choice.plan.boxLabel} · {choice.plan.tagLabel}
            </Text>
            <Text>
              Etapa: {choice.plan.eventType} · tratamento:{' '}
              {choice.plan.treatment}
              {choice.plan.policy ? ' · ' + choice.plan.policy : ''}
            </Text>
            <Text>
              Cenário: {choice.plan.scenario} · tentativa planejada{' '}
              {choice.plan.ordinal}
            </Text>
            <Text>
              {choice.hold
                ? 'Envio de capturas e estágios pausado para este operador. A leitura NFC continua física.'
                : 'Sincronização automática permitida.'}
            </Text>
          </StatusPanel>
        )}
        <Button
          mode="outlined"
          disabled={busy || state.status !== 'authenticated'}
          onPress={() => {
            void action(() => loadRuns());
          }}>
          Buscar roteiros na API
        </Button>
        {runs.map(r => (
          <Button
            key={r.id}
            disabled={busy || r.dataKind !== 'FISICO'}
            onPress={() => {
              void action(() => loadPlans(r));
            }}>
            {r.name}
            {r.dataKind === 'SINTETICO'
              ? ' · dados sintéticos, uso via script'
              : ''}
          </Button>
        ))}
        {run && (
          <Text variant="titleMedium">
            Tentativas deste aparelho · {run.name}
          </Text>
        )}
        {plans.map(p => (
          <Button
            key={p.id}
            mode="outlined"
            disabled={busy || queue.syncing}
            onPress={() => {
              void action(async () => {
                await journal.select(p, p.scenario !== 'LEGITIMO_ONLINE');
                setMessage(
                  'Roteiro selecionado. Abra Registrar etapa e escolha ' +
                    p.eventType +
                    '.',
                );
              });
            }}>
            #{p.ordinal} · {p.boxLabel} · {p.tagLabel} · {p.eventType}
          </Button>
        ))}
        {!!run && !plans.length && (
          <Text>
            Nenhuma tentativa física para este aparelho nesta página. Confira o
            identificador planejado ou avance a página.
          </Text>
        )}
        {!!runs.length && (
          <VStack gap={8}>
            <Button
              disabled={busy || page === 1}
              onPress={() => {
                void action(() =>
                  run ? loadPlans(run, page - 1) : loadRuns(page - 1),
                );
              }}>
              Página anterior
            </Button>
            <Text>
              Página {page} · {total} registros cadastrados
            </Text>
            <Button
              disabled={busy || page * 20 >= total}
              onPress={() => {
                void action(() =>
                  run ? loadPlans(run, page + 1) : loadRuns(page + 1),
                );
              }}>
              Próxima página
            </Button>
          </VStack>
        )}
        {choice.hold && (
          <Button
            mode="contained"
            disabled={busy || state.status !== 'authenticated'}
            onPress={() => {
              void action(async () => {
                await journal.release(queue.items);
                await queue.manager.synchronize(true);
                await queue.manager.refreshDecisions();
                await journal.flush();
              });
            }}>
            Liberar comunicação e sincronizar
          </Button>
        )}
        {!!choice.plan && (
          <Button
            disabled={busy || queue.syncing || choice.hold}
            onPress={() => {
              void action(() => journal.select(null));
            }}>
            Encerrar seleção de roteiro
          </Button>
        )}
        <Button
          disabled={busy}
          onPress={() => {
            void action(async () => {
              await journal.flush();
            });
          }}>
          Atualizar registros do ensaio
        </Button>
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </List.Accordion>
  );
}
