import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, RadioButton, Text } from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, { Passo } from '../../../components/ListaPassos';
import { useAppTheme } from '../../../theme';
import type { RotasProvisionar } from '../../../navigation/ProvisionarNavigator';
import { EnumEstrategiasNFC } from '../../../domain/enums/estrategiasNFC';

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

const ESTRATEGIAS: { valor: EnumEstrategiasNFC; titulo: string }[] = [
  { valor: EnumEstrategiasNFC.UID, titulo: 'UID' },
  { valor: EnumEstrategiasNFC.NDEF_ESTATICO, titulo: 'NDEF estático' },
];

const InformativoEtapas = () => {
  const theme = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();

  const [estrategia, setEstrategia] = React.useState(EnumEstrategiasNFC.UID);

  const iniciar = () =>
    navigation.navigate('EtapasProvisionamento', { estrategia });

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
              { color: theme.colors.onSurfaceVariant },
            ]}>
            Vincula uma etiqueta NFC a um pedido e bloqueia sua escrita.
          </Text>
        </VStack>

        <ListaPassos passos={PASSOS} />

        <VStack gap={4}>
          <Text variant="titleSmall">Estratégia</Text>
          <RadioButton.Group
            value={String(estrategia)}
            onValueChange={valor => setEstrategia(Number(valor))}>
            {ESTRATEGIAS.map(({ valor, titulo }) => (
              <RadioButton.Item
                key={valor}
                label={titulo}
                value={String(valor)}
                position="leading"
                labelStyle={styles.labelRadio}
              />
            ))}
          </RadioButton.Group>
        </VStack>

        <Aviso>
          O bloqueio altera as chaves da etiqueta. Confira os dados antes de
          confirmar.
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
  labelRadio: {
    textAlign: 'left',
  },
});

export default InformativoEtapas;
