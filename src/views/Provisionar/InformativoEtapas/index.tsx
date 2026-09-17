import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon, Text} from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import Card from '../../../components/Base/Card';
import VStack from '../../../components/Base/VStack';
import HStack from '../../../components/Base/HStack';
import {useAppTheme} from '../../../theme';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';

type Passo = {
  numero: number;
  titulo: string;
  descricao: string;
};

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Identificar o pedido',
    descricao: 'Informe o código do pedido que será vinculado à etiqueta.',
  },
  {
    numero: 2,
    titulo: 'Ler e bloquear a etiqueta',
    descricao:
      'Aproxime a etiqueta uma única vez: o UID é lido, vinculado ao pedido e a escrita é bloqueada.',
  },
];

const ItemPasso = ({passo}: {passo: Passo}) => {
  const theme = useAppTheme();

  return (
    <HStack gap={12} align="center">
      <VStack
        align="center"
        justify="center"
        style={[styles.numero, {backgroundColor: theme.colors.primary}]}>
        <Text variant="labelLarge" style={{color: theme.colors.onPrimary}}>
          {passo.numero}
        </Text>
      </VStack>

      <VStack flex={1} gap={2}>
        <Text variant="titleSmall">{passo.titulo}</Text>
        <Text
          variant="bodySmall"
          style={{color: theme.colors.onSurfaceVariant}}>
          {passo.descricao}
        </Text>
      </VStack>
    </HStack>
  );
};

const InformativoEtapas = () => {
  const theme = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();

  const iniciar = () => navigation.navigate('EtapasProvisionamento');

  return (
    <Tela scroll>
      <VStack gap={24}>
        <VStack align="center" gap={8}>
          <Icon source="nfc-tap" size={48} color={theme.colors.primary} />
          <Text variant="headlineSmall">Provisionar etiqueta</Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.centralizado,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Vincula uma etiqueta NFC a um pedido e bloqueia sua escrita.
          </Text>
        </VStack>

        <VStack gap={12}>
          {PASSOS.map(passo => (
            <ItemPasso key={passo.numero} passo={passo} />
          ))}
        </VStack>

        <Card
          style={[
            styles.aviso,
            {backgroundColor: theme.colors.warningContainer},
          ]}>
          <HStack gap={12} align="flex-start">
            <Icon
              source="alert-outline"
              size={20}
              color={theme.colors.onWarningContainer}
            />
            <VStack flex={1}>
              <Text
                variant="bodySmall"
                style={{color: theme.colors.onWarningContainer}}>
                O bloqueio altera as chaves da etiqueta. Confira os dados antes
                de confirmar.
              </Text>
            </VStack>
          </HStack>
        </Card>

        <Botao onPress={iniciar}>Iniciar</Botao>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  centralizado: {
    textAlign: 'center',
  },
  aviso: {
    borderRadius: 8,
    borderWidth: 0,
  },
});

export default InformativoEtapas;
