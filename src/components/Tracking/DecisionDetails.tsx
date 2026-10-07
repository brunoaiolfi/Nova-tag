import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import type {Decision} from '../../domain/traceability/types';
import {decisionStatus} from '../../domain/traceability/decision-status';
import {eventLabel, reasonLabel} from '../../views/traceability-labels';

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
        <Text>
          Prazo para conciliação: {date(decision.expiraEm)}. O vínculo e a
          sessão original precisam continuar válidos.
        </Text>
      )}
      {!!history && history.length > 1 && (
        <>
          <Text style={styles.title}>Evolução da decisão</Text>
          {history.map((d, i) => (
            <Text key={d.revisao ?? i}>
              Decisão {d.revisao ?? i + 1}
              {d.avaliadaEm ? ' · ' + date(d.avaliadaEm) : ''}:{' '}
              {reasonLabel(d.motivo)}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {gap: 8},
  title: {fontWeight: '700'},
});
