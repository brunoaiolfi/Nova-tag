import {showCommandFailure} from '../Base/Toast/service';
import React from 'react';
import {List, Text} from 'react-native-paper';
import {ActionButton as Button, StatusPanel} from '../Tracking';
import VStack from '../Base/VStack';
import {useExperimentPanel} from './use-experiment-panel';

export function ExperimentPanel() {
  const {
    selectionState,
    device,
    runs,
    run,
    plans,
    page,
    total,
    busy,
    message,
    available,
    online,
    syncing,
    loadRuns,
    loadPlans,
    select,
    release,
    refresh,
  } = useExperimentPanel();
  if (!available) return null;
  return (
    <List.Accordion
      title="Ensaio do TCC"
      description={
        selectionState.plan
          ? (selectionState.hold ? 'Envios pausados · ' : 'Roteiro · ') +
            selectionState.plan.tagLabel
          : 'Opcional · seguir um roteiro cadastrado'
      }>
      <VStack gap={12}>
        <Text>
          Selecione o roteiro e faça a leitura em Registrar. O administrador
          prepara o ensaio na API.
        </Text>
        <Text selectable>Identificador deste aparelho: {device}</Text>
        <Text>
          {selectionState.pending} estágios aguardando envio ·{' '}
          {selectionState.sent} confirmados · {selectionState.failed} recusados
        </Text>
        {!!selectionState.failed && (
          <Text accessibilityRole="alert">
            Há estágios recusados. Eles continuam no aparelho; confira a
            configuração e a exportação com o responsável pelo ensaio.
          </Text>
        )}
        {selectionState.plan && (
          <StatusPanel tone={selectionState.hold ? 'warning' : 'info'}>
            <Text variant="titleMedium">
              {selectionState.plan.boxLabel} · {selectionState.plan.tagLabel}
            </Text>
            <Text>
              Etapa: {selectionState.plan.eventType} · tratamento:{' '}
              {selectionState.plan.treatment}
              {selectionState.plan.policy
                ? ' · ' + selectionState.plan.policy
                : ''}
            </Text>
            <Text>
              Cenário: {selectionState.plan.scenario} · tentativa planejada{' '}
              {selectionState.plan.ordinal}
            </Text>
            <Text>
              {selectionState.hold
                ? 'Envio de capturas e estágios pausado para este operador. A leitura NFC continua física.'
                : 'Sincronização automática permitida.'}
            </Text>
          </StatusPanel>
        )}
        <Button
          mode="outlined"
          disabled={busy || !online}
          onPress={() => {
            loadRuns().catch(showCommandFailure);
          }}>
          Buscar roteiros
        </Button>
        {runs.map(experimentRun => (
          <Button
            key={experimentRun.id}
            disabled={busy || experimentRun.dataKind !== 'FISICO'}
            onPress={() => {
              loadPlans(experimentRun).catch(showCommandFailure);
            }}>
            {experimentRun.name}
            {experimentRun.dataKind === 'SINTETICO'
              ? ' · dados sintéticos, uso via script'
              : ''}
          </Button>
        ))}
        {run && (
          <Text variant="titleMedium">
            Tentativas deste aparelho · {run.name}
          </Text>
        )}
        {plans.map(experimentPlan => (
          <Button
            key={experimentPlan.id}
            mode="outlined"
            disabled={busy || syncing}
            onPress={() => {
              select(experimentPlan).catch(showCommandFailure);
            }}>
            #{experimentPlan.ordinal} · {experimentPlan.boxLabel} ·{' '}
            {experimentPlan.tagLabel} · {experimentPlan.eventType}
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
                (run ? loadPlans(run, page - 1) : loadRuns(page - 1)).catch(
                  showCommandFailure,
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
                (run ? loadPlans(run, page + 1) : loadRuns(page + 1)).catch(
                  showCommandFailure,
                );
              }}>
              Próxima página
            </Button>
          </VStack>
        )}
        {selectionState.hold && (
          <Button
            mode="contained"
            disabled={busy || !online}
            onPress={() => {
              release().catch(showCommandFailure);
            }}>
            Liberar e sincronizar
          </Button>
        )}
        {!!selectionState.plan && (
          <Button
            disabled={busy || syncing || selectionState.hold}
            onPress={() => {
              select(null).catch(showCommandFailure);
            }}>
            Encerrar seleção
          </Button>
        )}
        <Button
          disabled={busy}
          onPress={() => {
            refresh().catch(showCommandFailure);
          }}>
          Atualizar ensaio
        </Button>
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </List.Accordion>
  );
}
