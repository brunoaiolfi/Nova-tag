import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RadioButton, Text} from 'react-native-paper';
import {PageHero} from '../../../components/Tracking';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, {Passo} from '../../../components/ListaPassos';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Escolha o pedido',
    descricao:
      'Selecione um pedido da lista. O modelo da tag pode ficar como desconhecido.',
  },
  {
    numero: 2,
    titulo: 'Leia e vincule a etiqueta',
    descricao:
      'Aproxime a etiqueta do iPhone e confira o número lido. Para NDEF, o app também grava a referência.',
  },
  {
    numero: 3,
    titulo: 'Confira e ative',
    descricao:
      'Confirme a configuração física para liberar os registros de coleta e das próximas etapas.',
  },
];

const ESTRATEGIAS: {valor: EnumEstrategiasNFC; titulo: string}[] = [
  {
    valor: EnumEstrategiasNFC.UID,
    titulo: 'Usar o número da etiqueta (UID) · sem gravação',
  },
  {
    valor: EnumEstrategiasNFC.NDEF_ESTATICO,
    titulo: 'Gravar uma referência na etiqueta (NDEF estático)',
  },
];

const InformativoEtapas = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();

  const [estrategia, setEstrategia] = React.useState(EnumEstrategiasNFC.UID);

  const iniciar = () =>
    navigation.navigate('EtapasProvisionamento', {estrategia});

  return (
    <Tela scroll>
      <VStack gap={24}>
        <PageHero
          title="Dê uma identidade ao pedido."
          description="Vincule uma etiqueta NFC a um volume para começar a acompanhar seu trajeto."
          icon="nfc-tap"
          eyebrow="VINCULAR ETIQUETA"
        />

        <ListaPassos passos={PASSOS} />

        <VStack gap={4}>
          <Text variant="titleMedium">Como identificar a etiqueta?</Text>
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
                style={layoutStyles.strategyOption}
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
  labelRadio: {
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 24,
  },
});

export default InformativoEtapas;

const layoutStyles = StyleSheet.create({
  strategyOption: {
    minHeight: 76,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E1EB',
  },
});
