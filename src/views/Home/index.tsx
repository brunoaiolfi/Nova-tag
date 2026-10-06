import {StyleSheet, useWindowDimensions} from 'react-native';
import {ActionButton as Button} from '../../components/Tracking';
import React, {useState} from 'react';
import {Icon, Text} from 'react-native-paper';
import {View} from 'react-native';
import {ActionTile, trackingColors as colors} from '../../components/Tracking';
import ListaPassos from '../../components/ListaPassos';
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
  const [help, setHelp] = useState(false);
  const {width, fontScale} = useWindowDimensions();
  const singleColumn = width < 360 || fontScale > 1.25;
  const user = state.session?.user;
  const role =
    user?.perfil === 'ADMINISTRADOR'
      ? 'Administrador'
      : user?.perfil === 'OPERADOR'
      ? 'Operador'
      : 'Consulta';
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
    <Tela
      scroll
      header={
        <View style={layoutStyles.header}>
          <View style={layoutStyles.account}>
            <View style={layoutStyles.avatar}>
              <Icon source="account-outline" size={26} color={colors.blue} />
            </View>
            <View style={layoutStyles.accountText}>
              <Text style={layoutStyles.greeting}>Olá, {user?.nome}</Text>
              <Text style={layoutStyles.role}>{role} · Nova-tag</Text>
            </View>
          </View>
          <View style={layoutStyles.scanPanel}>
            <View style={layoutStyles.scanHeading}>
              <Icon source="nfc-search-variant" size={32} color={colors.blue} />
              <View style={layoutStyles.accountText}>
                <Text style={layoutStyles.scanTitle}>Encontre seu pedido</Text>
                <Text style={layoutStyles.scanDescription}>
                  Leia a etiqueta NFC para acompanhar.
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              buttonColor={colors.orange}
              textColor={colors.navy}
              icon="nfc-tap"
              onPress={() => setScanning(true)}>
              Escanear etiqueta
            </Button>
            <Text style={layoutStyles.hint}>
              A consulta não altera o pedido.
            </Text>
          </View>
        </View>
      }>
      <VStack gap={20}>
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
        <View>
          <Text variant="titleLarge" style={layoutStyles.sectionTitle}>
            O que você precisa fazer?
          </Text>
          <Text style={layoutStyles.sectionDescription}>
            Escolha uma ação para continuar.
          </Text>
        </View>
        <View
          style={[
            layoutStyles.actionList,
            singleColumn && layoutStyles.singleColumn,
          ]}>
          <ActionTile
            title="Abrir histórico"
            description="Veja a situação e todas as etapas."
            icon="map-marker-path"
            onPress={() => navigation.navigate('Historico')}
          />
          {user?.perfil !== 'CONSULTA' && (
            <ActionTile
              title="Registrar etapa"
              description="Atualize o caminho do pedido."
              icon="timeline-plus-outline"
              accent
              onPress={() => navigation.navigate('Eventos')}
            />
          )}
          {user?.perfil === 'CONSULTA' && (
            <ActionTile
              title="Como funciona"
              description="Entenda a etiqueta e o rastreio."
              icon="help-circle-outline"
              onPress={() => setHelp(value => !value)}
            />
          )}
        </View>
        {user?.perfil !== 'CONSULTA' && (
          <View
            style={[
              layoutStyles.actionList,
              singleColumn && layoutStyles.singleColumn,
            ]}>
            {user?.perfil === 'ADMINISTRADOR' && (
              <ActionTile
                title="Vincular etiqueta"
                description="Prepare a identificação do pedido."
                icon="nfc-tap"
                onPress={() => navigation.navigate('Provisionar')}
              />
            )}
            <ActionTile
              title="Como funciona"
              description="Entenda a etiqueta e o rastreio."
              icon="help-circle-outline"
              onPress={() => setHelp(value => !value)}
            />
            {user?.perfil !== 'ADMINISTRADOR' && !singleColumn && (
              <View style={layoutStyles.emptyTile} />
            )}
          </View>
        )}
        {help && (
          <VStack gap={16}>
            <Text variant="titleMedium" style={layoutStyles.sectionTitle}>
              Uma etiqueta, um caminho
            </Text>
            <ListaPassos
              passos={[
                {
                  numero: 1,
                  titulo: 'Identifique o pedido',
                  descricao:
                    'O administrador vincula e ativa a etiqueta de um volume.',
                },
                {
                  numero: 2,
                  titulo: 'Registre cada etapa',
                  descricao:
                    'O operador escolhe a etapa, lê a etiqueta e confere a decisão do registro.',
                },
                {
                  numero: 3,
                  titulo: 'Acompanhe o histórico',
                  descricao:
                    'Consulte o pedido pela etiqueta ou pelo código. Os registros aparecem em sequência.',
                },
              ]}
            />
            <Button onPress={() => setHelp(false)}>Fechar explicação</Button>
          </VStack>
        )}
        <Button
          mode="outlined"
          icon="logout"
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
  header: {
    backgroundColor: colors.blue,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  account: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {flex: 1, minWidth: 0},
  greeting: {color: 'white', fontWeight: '700', fontSize: 17, lineHeight: 24},
  role: {color: '#E2E7FF', fontSize: 13, lineHeight: 20},
  scanPanel: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 18,
    gap: 16,
    marginTop: 4,
  },
  scanHeading: {flexDirection: 'row', alignItems: 'center', gap: 12},
  scanTitle: {
    fontSize: 18,
    lineHeight: 25,
    color: colors.navy,
    fontWeight: '700',
  },
  scanDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 3,
  },
  hint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {fontWeight: '700', color: colors.navy},
  sectionDescription: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  actionList: {flexDirection: 'row', gap: 12},
  singleColumn: {flexDirection: 'column'},
  emptyTile: {flex: 1},
});
