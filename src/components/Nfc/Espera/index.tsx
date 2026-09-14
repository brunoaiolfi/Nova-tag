import React from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';

import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {useAppTheme} from '../../../theme';

type EsperaProps = {
  titulo?: string;
  subtitulo?: string;
};

const Espera = ({
  titulo = 'Aproxime a etiqueta',
  subtitulo = 'Encoste o celular na etiqueta NFC para realizar a leitura.',
}: EsperaProps) => {
  const theme = useAppTheme();

  return (
    <Tela>
      <VStack flex={1} align="center" justify="center" gap={16}>
        <Icon source="nfc" size={96} color={theme.colors.primary} />

        <VStack align="center" gap={4}>
          <Text variant="titleLarge">{titulo}</Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.centralizado,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            {subtitulo}
          </Text>
        </VStack>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  centralizado: {
    textAlign: 'center',
  },
});

export default Espera;
