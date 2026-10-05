import React, {useState} from 'react';
import {Button, Card, Text} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {RotasTab} from '../../navigation';
import {useSession} from '../../components/Auth/SessionProvider';

import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import Leitor from '../../components/Nfc/Leitor';
import type {Reading} from '../../appplication/traceability/workflow';
import TagDetails from '../../components/Nfc/TagDetails';

const Home = () => {
  const {manager, state} = useSession();
  const navigation = useNavigation<BottomTabNavigationProp<RotasTab>>();
  const [scanning, setScanning] = useState(false);
  const [reading, setReading] = useState<Reading>();
  const [capturedAt, setCapturedAt] = useState<string>();
  if (scanning) {
    return (
      <Leitor
        context="Consultar etiqueta · sem alterar o pedido"
        continueLabel="Concluir consulta"
        onVoltar={() => setScanning(false)}
        onLeituraRealizada={(value, time) => {
          setReading(value);
          setCapturedAt(time);
          setScanning(false);
        }}
        onErroLeitura={() => {}}
        onVerHistorico={(value, time) => {
          setReading(value);
          setCapturedAt(time);
          setScanning(false);
          navigation.navigate('Historico', {reading: value});
        }}
      />
    );
  }
  return (
    <Tela scroll>
      <VStack gap={20}>
        <Text variant="headlineMedium">Olá, {state.session?.user.nome}</Text>
        <Text>O que você quer fazer com a etiqueta?</Text>
        <Card mode="outlined">
          <Card.Content>
            <VStack gap={12}>
              <Text variant="titleLarge">Escanear e ver a tag</Text>
              <Text>
                Veja o número da etiqueta, o conteúdo NDEF e a tecnologia lida.
                Esta consulta não altera a tag nem movimenta o pedido.
              </Text>
              <Button
                mode="contained"
                accessibilityLabel="Escanear etiqueta"
                icon="nfc-search-variant"
                onPress={() => setScanning(true)}>
                Escanear etiqueta
              </Button>
            </VStack>
          </Card.Content>
        </Card>
        {reading && (
          <>
            <TagDetails reading={reading} capturedAt={capturedAt} />
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Historico', {reading})}>
              Ver histórico desta etiqueta
            </Button>
          </>
        )}
        <Card mode="outlined">
          <Card.Content>
            <VStack gap={8}>
              <Text variant="titleMedium">Consultar histórico</Text>
              <Text>
                Veja provisionamento, coleta, recebimento e os demais registros
                pela etiqueta ou pelo pedido.
              </Text>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Historico')}>
                Abrir histórico
              </Button>
            </VStack>
          </Card.Content>
        </Card>
        {state.session?.user.perfil === 'ADMINISTRADOR' && (
          <Card mode="outlined">
            <Card.Content>
              <VStack gap={8}>
                <Text variant="titleMedium">Vincular a um pedido</Text>
                <Text>
                  Escolha um pedido e configure a etiqueta para começar a
                  rastrear um volume.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Provisionar')}>
                  Vincular etiqueta
                </Button>
              </VStack>
            </Card.Content>
          </Card>
        )}
        {state.session?.user.perfil !== 'CONSULTA' && (
          <Card mode="outlined">
            <Card.Content>
              <VStack gap={8}>
                <Text variant="titleMedium">Registrar uma operação</Text>
                <Text>
                  Com a etiqueta já ativa, registre coleta, recebimento,
                  movimentação, expedição ou entrega.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Eventos')}>
                  Registrar evento
                </Button>
              </VStack>
            </Card.Content>
          </Card>
        )}
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
