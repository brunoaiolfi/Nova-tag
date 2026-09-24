import React from 'react';
import {Button, Text} from 'react-native-paper';
import {useSession} from '../../components/Auth/SessionProvider';

import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';

const Home = () => {
  const {manager, state} = useSession();
  return (
    <Tela>
      <VStack flex={1} align="center" justify="center">
        <Text variant="headlineMedium">Olá, {state.session?.user.nome}</Text>
        <Text>Perfil: {state.session?.user.perfil}</Text>
        <Button
          onPress={() => {
            void manager.logout();
          }}>
          Sair
        </Button>
      </VStack>
    </Tela>
  );
};

export default Home;
