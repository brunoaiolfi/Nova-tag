import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';

import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {useAppTheme} from '../../../theme';

type EsperaProps = {
  titulo?: string;
  subtitulo?: string;
  onPress?: () => void;
};

const Espera = ({
  titulo = 'Aproxime a etiqueta',
  subtitulo = 'Encoste o celular na etiqueta NFC para realizar a leitura.',
  onPress,
}: EsperaProps) => {
  const theme = useAppTheme();

  return (
    <Tela>
      <Pressable onPress={onPress} style={styles.area}>
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
      </Pressable>
    </Tela>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  centralizado: {
    textAlign: 'center',
  },
});

export default Espera;
