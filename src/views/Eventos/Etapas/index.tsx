import React from 'react';
import {Text} from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';

// TODO: implementar as etapas (selecionar tipo do evento -> ler etiqueta).
const EtapasEvento = () => (
  <Tela>
    <VStack flex={1} align="center" justify="center">
      <Text variant="headlineMedium">Eventos</Text>
    </VStack>
  </Tela>
);

export default EtapasEvento;
