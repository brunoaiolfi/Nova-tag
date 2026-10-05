import React, {useState} from 'react';
import {Button, Text} from 'react-native-paper';
import {useSession} from '../../components/Auth/SessionProvider';

import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import Leitor from '../../components/Nfc/Leitor';
import type {Reading} from '../../appplication/traceability/workflow';

const Home = () => {
  const {manager, state} = useSession();
  const [scanning, setScanning] = useState(false);
  const [reading, setReading] = useState<Reading>();
  const [message, setMessage] = useState('');
  if (scanning) {
    return (
      <Leitor
        onLeituraRealizada={value => {
          setReading(value);
          setMessage('');
          setScanning(false);
        }}
        onErroLeitura={setMessage}
      />
    );
  }
  return (
    <Tela>
      <VStack flex={1} align="center" justify="center">
        <Text variant="headlineMedium">Olá, {state.session?.user.nome}</Text>
        <Text>Perfil: {state.session?.user.perfil}</Text>
        <Button onPress={() => setScanning(true)}>
          Testar leitura NFC sem alterar a etiqueta
        </Button>
        {reading && (
          <Text selectable>
            UID: {reading.uid}
            {'\n'}NDEF: {reading.ndef ?? 'Sem NDEF'}
            {'\n'}Tecnologias: {reading.tecnologias?.join(', ')}
          </Text>
        )}
        {!!message && <Text>{message}</Text>}
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
