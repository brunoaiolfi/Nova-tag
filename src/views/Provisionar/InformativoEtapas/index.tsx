import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon, RadioButton, Text} from 'react-native-paper';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, {Passo} from '../../../components/ListaPassos';
import {useAppTheme} from '../../../theme';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Identificar o pedido',
    descricao:
      'Selecione um pedido da lista. O modelo da tag pode ficar como desconhecido.',
  },
  {
    numero: 2,
    titulo: 'Ler, registrar e configurar',
    descricao:
      'Leia a etiqueta e registre o vínculo na API. Para NDEF, grave e confira a referência do servidor antes da ativação.',
  },
];

const ESTRATEGIAS: {valor: EnumEstrategiasNFC; titulo: string}[] = [
  {
    valor: EnumEstrategiasNFC.UID,
    titulo: 'UID · usar o número da tag, sem gravar NDEF',
  },
  {
    valor: EnumEstrategiasNFC.NDEF_ESTATICO,
    titulo: 'NDEF estático · gravar a referência do pedido na tag',
  },
];

const InformativoEtapas = () => {
  const theme = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();

  const [estrategia, setEstrategia] = React.useState(EnumEstrategiasNFC.UID);

  const iniciar = () =>
    navigation.navigate('EtapasProvisionamento', {estrategia});

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
            Vincula uma etiqueta NFC física a um pedido existente na API.
          </Text>
        </VStack>

        <ListaPassos passos={PASSOS} />

        <VStack gap={4}>
          <Text variant="titleSmall">Estratégia</Text>
          <RadioButton.Group
            value={String(estrategia)}
            onValueChange={valor => setEstrategia(Number(valor))}>
            {ESTRATEGIAS.map(({valor, titulo}) => (
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
          A gravação NDEF substitui o conteúdo atual. Esta versão não altera
          chaves nem bloqueia a escrita. A ativação exige conferir externamente
          a configuração física e o bloqueio definidos para o ensaio.
        </Aviso>

        <Botao onPress={iniciar}>Escolher pedido</Botao>
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
