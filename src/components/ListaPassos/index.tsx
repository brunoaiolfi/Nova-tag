import React from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';

import VStack from '../Base/VStack';
import HStack from '../Base/HStack';
import {useAppTheme} from '../../theme';

export type Passo = {
  numero: number;
  titulo: string;
  descricao: string;
};

type ItemPassoProps = {
  passo: Passo;
};

const ItemPasso = ({passo}: ItemPassoProps) => {
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

type ListaPassosProps = {
  passos: Passo[];
};

const ListaPassos = ({passos}: ListaPassosProps) => (
  <VStack gap={12}>
    {passos.map(passo => (
      <ItemPasso key={passo.numero} passo={passo} />
    ))}
  </VStack>
);

const styles = StyleSheet.create({
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default ListaPassos;
