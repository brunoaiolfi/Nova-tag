import {Platform, StyleSheet} from 'react-native';
import React from 'react';
import {Icon, List, Text} from 'react-native-paper';
import {View} from 'react-native';
import {StatusPanel, trackingColors as colors} from '../Tracking';
import type {Reading} from '../../appplication/traceability/workflow';

const technologies: Record<string, string> = {
  iso7816: 'ISO 14443-4 · ISO-DEP',
  IsoDep: 'ISO 14443-4 · ISO-DEP',
  NfcA: 'Type A',
  Ndef: 'NDEF',
  mifare: 'MIFARE / Type A',
  iso15693: 'ISO 15693',
};

export default function TagDetails({
  reading,
  capturedAt,
}: {
  reading: Reading;
  capturedAt?: string;
}) {
  const reference = reading.ndef?.startsWith('urn:nfc-trace:provisioning:');
  return (
    <StatusPanel tone="success">
      <View style={layoutStyles.heading}>
        <Icon source="check-circle" size={24} color={colors.teal} />
        <Text variant="titleMedium" style={layoutStyles.title}>
          Etiqueta encontrada
        </Text>
      </View>
      <Text variant="labelLarge">Número da etiqueta (UID)</Text>
      <Text selectable variant="titleLarge" style={layoutStyles.uid}>
        {reading.uid.match(/.{1,2}/g)?.join(':') ?? reading.uid}
      </Text>
      {!!capturedAt && (
        <Text variant="bodySmall">
          Lida em {new Date(capturedAt).toLocaleString('pt-BR')}
        </Text>
      )}
      <Text>
        {reference
          ? 'Referência do NFC Trace encontrada'
          : reading.ndef
          ? 'A etiqueta já contém dados'
          : 'Nenhum texto ou link NDEF identificado'}
      </Text>
      <List.Accordion
        title="Ver detalhes técnicos"
        titleNumberOfLines={2}
        style={layoutStyles.accordion}
        titleStyle={layoutStyles.accordionTitle}>
        <View style={layoutStyles.details}>
          <Text variant="bodySmall">
            O formato da etiqueta e a tecnologia lida não identificam o modelo
            exato do chip.
          </Text>
          <Text selectable>
            Tecnologias:{' '}
            {(reading.tecnologias ?? [])
              .map(value => technologies[value] ?? value)
              .join(', ') || 'Não informadas pelo leitor'}
          </Text>
          <Text selectable>NDEF: {reading.ndef ?? 'Não identificado'}</Text>
          <Text variant="bodySmall">
            {reading.bytesBase64
              ? 'Mensagem NDEF original preservada na leitura Type 4. Os bytes acompanham o registro da etapa.'
              : 'Esta leitura não disponibilizou os bytes originais do NDEF. Nenhuma evidência binária foi reconstruída.'}
          </Text>
        </View>
      </List.Accordion>
    </StatusPanel>
  );
}

const layoutStyles = StyleSheet.create({
  heading: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  title: {fontWeight: '700', color: colors.teal, flexShrink: 1},
  uid: {
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accordion: {backgroundColor: 'transparent'},
  accordionTitle: {fontSize: 15},
  details: {gap: 10, paddingVertical: 12},
});
