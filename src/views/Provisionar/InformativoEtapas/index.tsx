import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RadioButton, Text} from 'react-native-paper';
import {
  ActionButton,
  Details,
  PageHero,
  trackingColors as colors,
} from '../../../components/Tracking';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, {Passo} from '../../../components/ListaPassos';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import {useSession} from '../../../components/Auth/SessionProvider';

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
    titulo: 'Número da etiqueta · UID',
  },
  {
    valor: EnumEstrategiasNFC.NDEF_ESTATICO,
    titulo: 'Referência gravada · NDEF',
  },
];

const InformativoEtapas = () => {
  const {state} = useSession();
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();

  const [estrategia, setEstrategia] = React.useState(EnumEstrategiasNFC.UID);

  const iniciar = () =>
    navigation.navigate('EtapasProvisionamento', {estrategia});

  return (
    <Tela
      scroll
      header={
        <PageHero
          fullBleed
          title="Vincular etiqueta"
          description="Escolha como identificar o pedido."
          icon="nfc-tap"
        />
      }
      footer={<Botao onPress={iniciar}>Escolher pedido</Botao>}>
      <VStack gap={16}>
        <VStack gap={4}>
          <Text variant="titleMedium">Identificação</Text>
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
                style={[
                  layoutStyles.strategyOption,
                  estrategia === valor && layoutStyles.selectedStrategy,
                ]}
              />
            ))}
          </RadioButton.Group>
        </VStack>
        <Text variant="bodySmall">
          {estrategia === EnumEstrategiasNFC.UID
            ? 'Usa o número da tag, sem gravar NDEF.'
            : 'Substitui o NDEF atual por uma referência do pedido.'}
        </Text>
        {state.session?.user.perfil === 'ADMINISTRADOR' && (
          <ActionButton
            mode="outlined"
            icon="shield-check-outline"
            onPress={() => navigation.navigate('Administracao')}>
            Configurar NTAG 424
          </ActionButton>
        )}
        <Details title="Como vincular">
          <ListaPassos passos={PASSOS} />
          <Aviso>
            O fluxo simples não bloqueia a escrita. Confira a configuração
            física e o bloqueio do ensaio antes de ativar.
          </Aviso>
        </Details>
        <Details title="Outras opções">
          <VStack gap={8}>
            <ActionButton
              icon="tag-outline"
              onPress={() => navigation.navigate('Gerenciar')}>
              Gerenciar etiqueta
            </ActionButton>
          </VStack>

          <VStack gap={8}>
            <ActionButton
              icon="nfc-search-variant"
              onPress={() => navigation.navigate('Diagnostico')}>
              Diagnosticar etiqueta
            </ActionButton>
          </VStack>
        </Details>
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
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    marginTop: 10,
  },
  selectedStrategy: {backgroundColor: colors.pale, borderColor: colors.blue},
});
