import {StyleSheet} from 'react-native';
import React from 'react';
import {List, Text} from 'react-native-paper';
import {View} from 'react-native';
import {StatusPanel} from '../Tracking';
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
      <Text variant="titleMedium" style={layoutStyles.title}>
        Etiqueta encontrada
      </Text>
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
        </View>
      </List.Accordion>
    </StatusPanel>
  );
}

const layoutStyles = StyleSheet.create({
  title: {fontWeight: '700'},
  uid: {fontWeight: '700', letterSpacing: 0.5},
  accordion: {backgroundColor: 'transparent'},
  accordionTitle: {fontSize: 15},
  details: {gap: 10, paddingVertical: 12},
});
