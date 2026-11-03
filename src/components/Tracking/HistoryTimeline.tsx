import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, Text} from 'react-native-paper';
import type {HistoryEntry} from '../../appplication/traceability/contracts/history.types';
import {eventLabel, reasonLabel, stateLabel} from './labels';
import {Details, trackingColors as colors} from './index';
import {SdmEvidence} from './SdmEvidence';
import {decisionStatus} from '../../domain/traceability/decision-status';
import {DecisionDetails} from './DecisionDetails';

const date = (value: string) => new Date(value).toLocaleString('pt-BR');
const descriptions: Record<string, string> = {
  PROVISIONAMENTO: 'Etiqueta ativada para este pedido.',
  COLETA: 'Coleta registrada. O pedido iniciou seu trajeto.',
  RECEBIMENTO: 'Entrada do pedido registrada.',
  MOVIMENTACAO: 'Uma movimentação foi adicionada ao trajeto.',
  EXPEDICAO: 'Saída para entrega registrada.',
  ENTREGA: 'Entrega registrada. Trajeto concluído.',
};
const icons: Record<string, string> = {
  PROVISIONAMENTO: 'nfc-tap',
  COLETA: 'truck-outline',
  RECEBIMENTO: 'warehouse',
  MOVIMENTACAO: 'map-marker-path',
  EXPEDICAO: 'truck-delivery-outline',
  ENTREGA: 'check',
};

export function HistoryItem({
  entry,
  anotherLink,
  isLast = false,
}: {
  entry: HistoryEntry;
  anotherLink: boolean;
  isLast?: boolean | undefined;
}) {
  const decision = entry.decisao;
  const status = decisionStatus(decision);
  const waiting = status === 'PENDENTE';
  const late = status === 'TARDIA';
  const color = decision.autorizada
    ? colors.teal
    : waiting || late
    ? colors.amber
    : colors.red;
  return (
    <View style={styles.item} testID={`history-entry-${entry.id}`}>
      <View style={styles.rail}>
        {!isLast && <View style={styles.line} />}
        <View
          style={[
            styles.dot,
            {
              backgroundColor: decision.autorizada
                ? colors.green
                : waiting || late
                ? colors.amberBackground
                : colors.redBackground,
            },
          ]}>
          <Icon
            source={
              decision.autorizada
                ? icons[entry.tipo] ?? 'map-marker'
                : waiting
                ? 'clock-outline'
                : late
                ? 'history'
                : 'close'
            }
            size={22}
            color={color}
          />
        </View>
      </View>
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          variant="titleMedium"
          style={styles.title}>
          {entry.tipo === 'PROVISIONAMENTO'
            ? 'Etiqueta ativada'
            : eventLabel(entry.tipo)}
        </Text>
        <Text style={[styles.decision, {color}]}>
          {decision.autorizada
            ? 'Operação autorizada'
            : waiting
            ? 'Aguardando etapa anterior · salva no servidor'
            : late
            ? 'Leitura tardia preservada · sem movimentação'
            : 'Operação rejeitada · pedido não alterado'}
        </Text>
        <Text style={styles.description}>
          {decision.autorizada
            ? descriptions[entry.tipo] ?? reasonLabel(decision.motivo)
            : reasonLabel(decision.motivo)}
        </Text>
        {decision.classificacao === 'SUSPEITO' && (
          <Text style={styles.warning}>
            Leitura suspeita · divergências identificadas
          </Text>
        )}
        <SdmEvidence sdm={decision.sdm} />
        <DecisionDetails
          decision={decision}
          history={entry.historicoDecisoes}
        />
        {decision.alterouEstado && (
          <Text style={styles.change}>
            {stateLabel(decision.estadoAnterior)} →{' '}
            {stateLabel(decision.estadoResultante)}
          </Text>
        )}
        <Text style={styles.date}>
          Recebido pelo servidor: {date(entry.recebidoEm)}
        </Text>
        {anotherLink && (
          <Text style={styles.date}>Outro vínculo deste pedido</Text>
        )}
        <Details title="Detalhes do registro">
          <View style={styles.details}>
            <Text>
              {entry.origem === 'SISTEMA'
                ? 'Horário da ativação'
                : 'Horário declarado pelo aparelho'}
              : {date(entry.ocorridoEm)}
            </Text>
            <Text>
              Estado após o registro: {stateLabel(decision.estadoResultante)}
            </Text>
            <Text>
              Origem:{' '}
              {entry.origem === 'SISTEMA'
                ? 'Ativação da etiqueta pelo sistema'
                : 'Captura enviada pelo aplicativo'}
            </Text>
            <Text>
              Classificação:{' '}
              {decision.classificacao === 'SUSPEITO' ? 'Suspeito' : 'Regular'}
            </Text>
            {!!entry.autoria && (
              <Text>
                Autoria:{' '}
                {entry.autoria.tipo === 'AUTENTICADA'
                  ? 'Operador autenticado'
                  : 'Informação declarada'}
              </Text>
            )}
            {!!entry.autoria?.usuarioId && (
              <Text selectable>
                Identificador do operador: {entry.autoria.usuarioId}
              </Text>
            )}
            {decision.avisos.map((warning, index) => (
              <Text key={`${warning}-${index}`}>{reasonLabel(warning)}</Text>
            ))}
            <Text selectable>Registro: {entry.id}</Text>
            <Text selectable>Vínculo: {entry.provisionamentoId}</Text>
            <Text>Motivo: {decision.motivo}</Text>
          </View>
        </Details>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'white',
  },
  rail: {width: 40, alignItems: 'center'},
  line: {
    position: 'absolute',
    top: 38,
    bottom: 0,
    width: 2,
    backgroundColor: colors.line,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {flex: 1, minWidth: 0, gap: 8},
  title: {fontWeight: '700', color: colors.navy},
  decision: {fontSize: 14, lineHeight: 21, fontWeight: '700'},
  description: {fontSize: 16, lineHeight: 24, color: colors.navy},
  date: {fontSize: 13, lineHeight: 20, color: colors.muted},
  change: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.blue,
    fontWeight: '600',
    backgroundColor: colors.pale,
    padding: 10,
    borderRadius: 10,
  },
  warning: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.amber,
    backgroundColor: colors.amberBackground,
    padding: 8,
    borderRadius: 6,
  },
  details: {
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
