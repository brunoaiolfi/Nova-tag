import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import type {Decision} from '../../domain/traceability/decision';
import {decisionStatus} from '../../domain/traceability/decision-status';
import {eventLabel, reasonLabel} from './labels';
import {Details} from '.';

const date = (value: string) => new Date(value).toLocaleString('pt-BR');
export function DecisionDetails({
  decision,
  history,
}: {
  decision: Decision['decisao'];
  history?: Decision['decisao'][];
}) {
  const pending = decisionStatus(decision) === 'PENDENTE';
  return (
    <View style={styles.container}>
      {pending && (
        <Text>
          Aguardando:{' '}
          {(decision.dependencias ?? [])
            .map(dep => eventLabel(dep.tipo))
            .join(' → ') || 'etapa anterior'}
          .
        </Text>
      )}
      {pending && decision.expiraEm && (
        <Text>Prazo: {date(decision.expiraEm)}.</Text>
      )}
      {!!history && history.length > 1 && (
        <Details title="Evolução da decisão">
          {history.map((decisionRevision, i) => (
            <Text key={decisionRevision.revisao ?? i}>
              Decisão {decisionRevision.revisao ?? i + 1}
              {decisionRevision.avaliadaEm
                ? ' · ' + date(decisionRevision.avaliadaEm)
                : ''}
              : {reasonLabel(decisionRevision.motivo)}
            </Text>
          ))}
        </Details>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {gap: 8},
  title: {fontWeight: '700'},
});
