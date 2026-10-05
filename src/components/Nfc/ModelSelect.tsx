import React, {useState} from 'react';
import {Button, Card, RadioButton, Text, TextInput} from 'react-native-paper';
import VStack from '../Base/VStack';

const models = [
  {value: 'DESCONHECIDO', label: 'Desconhecido (padrão)'},
  {value: 'FEIJU_MODELO_DESCONHECIDO', label: 'Feiju · modelo desconhecido'},
  {value: 'NTAG213', label: 'NTAG213'},
  {value: 'NTAG215', label: 'NTAG215'},
  {value: 'NTAG216', label: 'NTAG216'},
  {value: 'NTAG424_DNA', label: 'NTAG424 DNA'},
  {value: 'OUTRO', label: 'Outro modelo conhecido'},
];
export default function ModelSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (model: string) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [custom, setCustom] = useState(false);
  return (
    <Card mode="outlined">
      <Card.Content>
        <VStack gap={8}>
          <Text variant="titleMedium">Modelo da tag</Text>
          <Text>
            {models.find(model => model.value === value)?.label ?? value}
          </Text>
          <Text variant="bodySmall">
            Pode deixar como desconhecido. Só escolha outro modelo se souber
            qual é o chip; “fitinha” e ISO 14443-4 não definem o modelo.
          </Text>
          {!disabled && (
            <Button onPress={() => setExpanded(!expanded)}>
              {expanded ? 'Fechar opções' : 'Escolher modelo'}
            </Button>
          )}
          {expanded && !disabled && (
            <>
              {models.map(model => (
                <RadioButton.Item
                  key={model.value}
                  label={model.label}
                  value={model.value}
                  position="leading"
                  status={
                    (custom ? model.value === 'OUTRO' : model.value === value)
                      ? 'checked'
                      : 'unchecked'
                  }
                  onPress={() => {
                    setCustom(model.value === 'OUTRO');
                    onChange(model.value === 'OUTRO' ? '' : model.value);
                    if (model.value !== 'OUTRO') {
                      setExpanded(false);
                    }
                  }}
                />
              ))}
              {custom && (
                <TextInput
                  label="Nome do modelo conhecido"
                  value={value}
                  onChangeText={onChange}
                  maxLength={64}
                />
              )}
            </>
          )}
        </VStack>
      </Card.Content>
    </Card>
  );
}
