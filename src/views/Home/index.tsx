import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../components/Tracking';
import React, {useState} from 'react';
import {Text} from 'react-native-paper';
import {View} from 'react-native';
import {ActionRow, PageHero} from '../../components/Tracking';
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
        <Text variant="bodyMedium">Olá, {state.session?.user.nome}</Text>
        <PageHero
          title="Rastreie seu pedido."
          description="Leia a etiqueta para encontrar o pedido e acompanhar o que aconteceu com ele."
          icon="map-marker-path"
        />
        <Button
          mode="contained"
          accessibilityLabel="Escanear etiqueta"
          icon="nfc-search-variant"
          onPress={() => setScanning(true)}>
          Escanear etiqueta
        </Button>
        <Text style={layoutStyles.hint}>A consulta não altera o pedido.</Text>
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
        <Text variant="titleLarge" style={layoutStyles.sectionTitle}>
          Acompanhar e atualizar
        </Text>
        <View style={layoutStyles.actionList}>
          <ActionRow
            title="Abrir histórico"
            description="Busque um pedido e veja suas etapas, do cadastro à entrega."
            icon="map-marker-path"
            onPress={() => navigation.navigate('Historico')}
          />
          {state.session?.user.perfil === 'ADMINISTRADOR' && (
            <ActionRow
              title="Vincular etiqueta"
              description="Prepare uma etiqueta para identificar um volume do pedido."
              icon="nfc-tap"
              onPress={() => navigation.navigate('Provisionar')}
            />
          )}
          {state.session?.user.perfil !== 'CONSULTA' && (
            <ActionRow
              title="Registrar etapa"
              description="Informe uma coleta, recebimento, movimentação, saída ou entrega."
              icon="timeline-plus-outline"
              onPress={() => navigation.navigate('Eventos')}
            />
          )}
        </View>
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

const layoutStyles = StyleSheet.create({
  hint: {textAlign: 'center'},
  sectionTitle: {fontWeight: '700'},
  actionList: {borderRadius: 16, overflow: 'hidden'},
});
