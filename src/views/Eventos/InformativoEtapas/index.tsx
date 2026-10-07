import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {PageHero} from '../../../components/Tracking';

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
          title="Atualize o caminho do pedido."
          description="Registre o que aconteceu com o volume usando sua etiqueta NFC."
          icon="timeline-plus-outline"
          eyebrow="REGISTRAR ETAPA"
        />
      }
      footer={<Botao onPress={iniciar}>Iniciar</Botao>}>
      <VStack gap={16}>
        <ListaPassos passos={PASSOS} />

        <Aviso icone="cloud-off-outline">
          A captura fica salva neste aparelho, mesmo sem conexão. O envio e a
          autorização acontecem quando a API estiver disponível. Confira a
          decisão antes de seguir com o pedido.
        </Aviso>
      </VStack>
    </Tela>
  );
};

export default InformativoEtapas;
