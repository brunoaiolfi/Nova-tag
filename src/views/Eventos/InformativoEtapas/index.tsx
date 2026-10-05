import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon, Text} from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, {Passo} from '../../../components/ListaPassos';
import {useAppTheme} from '../../../theme';
import type {RotasEventos} from '../../../navigation/EventosNavigator';

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Selecionar o tipo de evento',
    descricao:
      'Escolha o que está acontecendo com o pedido: coleta, recebimento, movimentação, expedição ou entrega.',
  },
  {
    numero: 2,
    titulo: 'Simular captura',
    descricao:
      'Informe UID e texto NDEF fictícios para testar a próxima tela. Nenhuma etiqueta será acessada.',
  },
];

const InformativoEtapas = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RotasEventos>>();

  const iniciar = () => navigation.navigate('EtapasEvento');

  return (
    <Tela scroll>
      <VStack gap={24}>
        <VStack align="center" gap={8}>
          <Icon
            source="timeline-plus-outline"
            size={48}
            color={theme.colors.primary}
          />
          <Text variant="headlineSmall">Registrar evento</Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.centralizado,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Teste as telas de evento com uma captura simulada.
          </Text>
        </VStack>

        <ListaPassos passos={PASSOS} />

        <Aviso icone="cloud-off-outline">
          Nesta prévia, os eventos não são enviados à API. O login exige que
          a API esteja disponível.
        </Aviso>

        <Botao onPress={iniciar}>Iniciar</Botao>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  centralizado: {
    textAlign: 'center',
  },
});

export default InformativoEtapas;
