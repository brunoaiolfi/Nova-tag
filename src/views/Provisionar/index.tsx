import React from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';

import Tela from '../../components/Tela';
import Botao from '../../components/Botao';
import Card from '../../components/Card';
import VStack from '../../components/VStack';
import HStack from '../../components/HStack';
import {useAppTheme} from '../../theme';

type Passo = {
  numero: number;
  titulo: string;
  descricao: string;
};

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Ler a etiqueta',
    descricao: 'Aproxime a etiqueta para identificar o UID e o modelo do chip.',
  },
  {
    numero: 2,
    titulo: 'Escolher a estratégia',
    descricao:
      'Apenas as estratégias suportadas pelo modelo detectado ficam disponíveis.',
  },
  {
    numero: 3,
    titulo: 'Identificar o pedido',
    descricao: 'Busque pelo código do pedido que será vinculado à etiqueta.',
  },
  {
    numero: 4,
    titulo: 'Conferir os dados',
    descricao: 'Revise UID, modelo, estratégia e pedido antes de confirmar.',
  },
  {
    numero: 5,
    titulo: 'Bloquear a etiqueta',
    descricao:
      'Aproxime a mesma etiqueta novamente para gravar as chaves e bloquear a escrita.',
  },
];

const ItemPasso = ({passo}: {passo: Passo}) => {
  const theme = useAppTheme();

  return (
      <HStack gap={12} align="center">
        <VStack
          align="center"
          justify="center"
          style={[styles.numero, {backgroundColor: theme.colors.primary}]}>
          <Text variant="labelLarge" style={{color: theme.colors.onPrimary}}>
            {passo.numero}
          </Text>
        </VStack>

        <VStack flex={1} gap={2}>
          <Text variant="titleSmall">{passo.titulo}</Text>
          <Text
            variant="bodySmall"
            style={{color: theme.colors.onSurfaceVariant}}>
            {passo.descricao}
          </Text>
        </VStack>
      </HStack>
  );
};

const Provisionar = () => {
  const theme = useAppTheme();

  const iniciar = () => {
    // TODO: iniciar o fluxo de provisionamento
  };

  return (
    <Tela scroll>
      <VStack gap={24}>
        <VStack align="center" gap={8}>
        <Icon source="nfc-tap" size={48} color={theme.colors.primary} />
        <Text variant="headlineSmall">Provisionar etiqueta</Text>
        <Text
          variant="bodyMedium"
          style={[styles.centralizado, {color: theme.colors.onSurfaceVariant}]}>
          Vincula uma etiqueta NFC a um pedido e bloqueia sua escrita.
          </Text>
        </VStack>

        <VStack gap={12}>
          {PASSOS.map(passo => (
            <ItemPasso key={passo.numero} passo={passo} />
          ))}
        </VStack>

        <Card
          style={[
            styles.aviso,
            {backgroundColor: theme.colors.warningContainer},
          ]}>
          <HStack gap={12} align="flex-start">
            <Icon
              source="alert-outline"
              size={20}
              color={theme.colors.onWarningContainer}
            />
            <VStack flex={1}>
              <Text
                variant="bodySmall"
                style={{color: theme.colors.onWarningContainer}}>
                O bloqueio altera as chaves da etiqueta. Confira os dados antes
                de confirmar.
              </Text>
            </VStack>
          </HStack>
        </Card>

        <Botao onPress={iniciar}>Iniciar</Botao>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  centralizado: {
    textAlign: 'center',
  },
  aviso: {
    borderRadius: 8,
    borderWidth: 0,
  },
});

export default Provisionar;
