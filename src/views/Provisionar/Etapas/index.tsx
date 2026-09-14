import React from 'react';
import {Text} from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';

enum Etapa {
  LEITURA_INICIAL = 'leitura_inicial',
  IDENTIFICAR_PEDIDO = 'identificar_pedido',
  BLOQUEAR = 'bloquear',
}

const Etapas = () => {
    const [etapaAtual, setEtapaAtual] = React.useState<Etapa>(
    Etapa.LEITURA_INICIAL,
  );

  return (
    <Tela>
      <VStack flex={1} align="center" justify="center">
        <Text variant="headlineMedium">{etapaAtual}</Text>
      </VStack>
    </Tela>
  );
};

export default Etapas;
