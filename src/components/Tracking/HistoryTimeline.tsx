import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, List, Text} from 'react-native-paper';
import type {HistoryEntry} from '../../appplication/traceability/workflow';
import {
  eventLabel,
  reasonLabel,
  stateLabel,
} from '../../views/traceability-labels';
import {trackingColors as colors} from './index';
import {SdmEvidence} from './SdmEvidence';

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
  isLast?: boolean;
}) {
  const decision = entry.decisao;
  const color = decision.autorizada ? colors.teal : colors.red;
  return (
    <View style={styles.item}>
      <View style={styles.rail}>
        {!isLast && <View style={styles.line} />}
        <View
          style={[
            styles.dot,
            {
              backgroundColor: decision.autorizada
                ? colors.green
                : colors.redBackground,
            },
          ]}>
          <Icon
            source={
              decision.autorizada ? icons[entry.tipo] ?? 'map-marker' : 'close'
            }
            size={22}
            color={color}
          />
        </View>
      </View>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          {entry.tipo === 'PROVISIONAMENTO'
            ? 'Etiqueta ativada'
            : eventLabel(entry.tipo)}
        </Text>
        <Text style={[styles.decision, {color}]}>
          {decision.autorizada
            ? 'Operação autorizada'
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
        <List.Accordion
          title="Detalhes do registro"
          titleNumberOfLines={2}
          style={styles.accordion}
          titleStyle={styles.accordionTitle}>
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
        </List.Accordion>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {flexDirection: 'row', gap: 14},
  rail: {width: 40, alignItems: 'center'},
  line: {
    position: 'absolute',
    top: 38,
    bottom: -4,
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
  content: {flex: 1, minWidth: 0, paddingBottom: 28, gap: 8},
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
  accordion: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    minHeight: 48,
  },
  accordionTitle: {fontSize: 14, color: colors.muted},
  details: {
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
