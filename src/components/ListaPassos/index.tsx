import React from 'react';
import {StyleSheet, View} from 'react-native';
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

const ItemPasso = ({passo, last}: ItemPassoProps & {last: boolean}) => {
  const theme = useAppTheme();

  return (
    <HStack gap={16} align="stretch">
      <View style={layoutStyles.rail}>
        {!last && <View style={layoutStyles.connector} />}
        <VStack
          align="center"
          justify="center"
          style={[styles.numero, {backgroundColor: theme.colors.primary}]}>
          <Text variant="labelLarge" style={{color: theme.colors.onPrimary}}>
            {passo.numero}
          </Text>
        </VStack>
      </View>

      <VStack flex={1} gap={2}>
        <Text variant="titleMedium" style={layoutStyles.stepTitle}>
          {passo.titulo}
        </Text>
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
  <VStack gap={20}>
    {passos.map((passo, index) => (
      <ItemPasso
        key={passo.numero}
        passo={passo}
        last={index === passos.length - 1}
      />
    ))}
  </VStack>
);

const styles = StyleSheet.create({
  numero: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

export default ListaPassos;

const layoutStyles = StyleSheet.create({
  rail: {width: 36, alignItems: 'center'},
  connector: {
    position: 'absolute',
    top: 36,
    bottom: -20,
    width: 2,
    backgroundColor: '#D6E1EB',
  },
  stepTitle: {fontWeight: '700'},
});
