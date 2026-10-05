import React from 'react';
import {Card, List, Text} from 'react-native-paper';
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
    <Card mode="outlined">
      <Card.Title
        title="Etiqueta encontrada"
        subtitle="Dados da última leitura"
      />
      <Card.Content>
        <Text variant="labelLarge">Número da etiqueta (UID)</Text>
        <Text selectable variant="titleMedium">
          {reading.uid.match(/.{1,2}/g)?.join(':') ?? reading.uid}
        </Text>
        {!!capturedAt && (
          <Text variant="bodySmall">
            Lida em {new Date(capturedAt).toLocaleString('pt-BR')}
          </Text>
        )}
        <List.Item
          title="Conteúdo NDEF"
          description={
            reference
              ? 'Referência do NFC Trace encontrada'
              : reading.ndef
              ? 'A etiqueta já contém dados'
              : 'Nenhum texto ou link NDEF identificado'
          }
          descriptionNumberOfLines={3}
        />
        <Text variant="bodySmall">
          O formato da etiqueta e a tecnologia lida não identificam o modelo
          exato do chip.
        </Text>
        <List.Accordion title="Ver detalhes técnicos">
          <Text selectable>
            Tecnologias:{' '}
            {(reading.tecnologias ?? [])
              .map(value => technologies[value] ?? value)
              .join(', ') || 'Não informadas pelo leitor'}
          </Text>
          <Text selectable>NDEF: {reading.ndef ?? 'Não identificado'}</Text>
        </List.Accordion>
      </Card.Content>
    </Card>
  );
}
