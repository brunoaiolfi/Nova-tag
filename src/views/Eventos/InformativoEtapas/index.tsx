import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Details, FlowSteps, PageHero} from '../../../components/Tracking';

import Tela from '../../../components/Base/Tela';
import Botao from '../../../components/Base/Botao';
import VStack from '../../../components/Base/VStack';
import Aviso from '../../../components/Aviso';
import ListaPassos, {Passo} from '../../../components/ListaPassos';
import type {RotasEventos} from '../../../navigation/EventosNavigator';

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Escolha o que aconteceu',
    descricao:
      'Escolha o que está acontecendo com o pedido: coleta, recebimento, movimentação, expedição ou entrega.',
  },
  {
    numero: 2,
    titulo: 'Leia a etiqueta do pedido',
    descricao:
      'Aproxime a etiqueta do iPhone. O número e o horário da leitura são preenchidos pelo app.',
  },
  {
    numero: 3,
    titulo: 'Confira e confirme',
    descricao:
      'Envie o registro e confira se a etapa foi autorizada antes de continuar.',
  },
];

const InformativoEtapas = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RotasEventos>>();

  const iniciar = () => navigation.navigate('EtapasEvento');

  return (
    <Tela
      scroll
      header={
        <PageHero
          fullBleed
          title="Registrar etapa"
          description="Escolha a etapa e leia a etiqueta."
          icon="timeline-plus-outline"
        />
      }
      footer={<Botao onPress={iniciar}>Escolher etapa</Botao>}>
      <VStack gap={16}>
        <FlowSteps labels={['Escolher', 'Ler', 'Confirmar']} current={1} />
        <Aviso icone="cloud-off-outline">
          Salvo no aparelho. A etapa só avança após a autorização do servidor.
        </Aviso>
        <Details title="Como funciona">
          <ListaPassos passos={PASSOS} />
        </Details>
      </VStack>
    </Tela>
  );
};

export default InformativoEtapas;
