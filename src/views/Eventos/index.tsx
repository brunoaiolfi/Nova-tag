import React from 'react';
import {Text} from 'react-native-paper';

import Tela from '../../components/Tela';
import VStack from '../../components/VStack';

const Eventos = () => (
  <Tela>
    <VStack flex={1} align="center" justify="center">
      <Text variant="headlineMedium">Eventos</Text>
    </VStack>
  </Tela>
);

export default Eventos;
