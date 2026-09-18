import React from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';

import Tela from '../../../../components/Base/Tela';
import Card from '../../../../components/Base/Card';
import Botao from '../../../../components/Base/Botao';
import VStack from '../../../../components/Base/VStack';
import HStack from '../../../../components/Base/HStack';
import {
  EnumTipoEvento,
  descricaoEnumTipoEvento,
} from '../../../../domain/enums/tipoEvento';
import {useAppTheme} from '../../../../theme';

type AparenciaEvento = {
  icone: string;
  descricao: string;
};

const APARENCIA: Record<EnumTipoEvento, AparenciaEvento> = {
  [EnumTipoEvento.PROVISIONAMENTO]: {
    icone: 'nfc-tap',
    descricao: 'A etiqueta foi vinculada ao pedido.',
  },
  [EnumTipoEvento.COLETA]: {
    icone: 'package-variant-closed',
    descricao: 'O pedido foi retirado na origem.',
  },
  [EnumTipoEvento.RECEBIMENTO]: {
    icone: 'inbox-arrow-down',
    descricao: 'O pedido deu entrada em uma unidade.',
  },
  [EnumTipoEvento.MOVIMENTACAO]: {
    icone: 'truck-outline',
    descricao: 'O pedido mudou de posição ou de unidade.',
  },
  [EnumTipoEvento.EXPEDICAO]: {
    icone: 'truck-delivery-outline',
    descricao: 'O pedido saiu para entrega.',
  },
  [EnumTipoEvento.ENTREGA]: {
    icone: 'home-import-outline',
    descricao: 'O pedido foi entregue ao destinatário.',
  },
};

/**
 * `PROVISIONAMENTO` fica de fora: é gerado pelo fluxo de provisionamento, como
 * evento zero da cadeia.
 */
const TIPOS_SELECIONAVEIS = [
  EnumTipoEvento.COLETA,
  EnumTipoEvento.RECEBIMENTO,
  EnumTipoEvento.MOVIMENTACAO,
  EnumTipoEvento.EXPEDICAO,
  EnumTipoEvento.ENTREGA,
];

type ItemOpcaoProps = {
  tipo: EnumTipoEvento;
  selecionada: boolean;
  onSelecionar: (tipo: EnumTipoEvento) => void;
};

const ItemOpcao = ({tipo, selecionada, onSelecionar}: ItemOpcaoProps) => {
  const {icone, descricao} = APARENCIA[tipo];
  const theme = useAppTheme();

  const cor = selecionada
    ? theme.colors.primary
    : theme.colors.onSurfaceVariant;

  return (
    <TouchableRipple
      style={styles.toque}
      onPress={() => onSelecionar(tipo)}
      accessibilityRole="radio"
      accessibilityState={{selected: selecionada}}>
      <Card
        style={selecionada ? {borderColor: theme.colors.primary} : undefined}>
        <HStack gap={12} align="center">
          <Icon source={icone} size={24} color={cor} />

          <VStack flex={1} gap={2}>
            <Text variant="titleSmall">{descricaoEnumTipoEvento[tipo]}</Text>
            <Text
              variant="bodySmall"
              style={{color: theme.colors.onSurfaceVariant}}>
              {descricao}
            </Text>
          </VStack>

          {selecionada && (
            <Icon
              source="check-circle"
              size={20}
              color={theme.colors.primary}
            />
          )}
        </HStack>
      </Card>
    </TouchableRipple>
  );
};

type SelecionarEventoProps = {
  onSelecionarEvento: (tipo: EnumTipoEvento) => void;
  tipoInicial?: EnumTipoEvento;
};

const SelecionarEvento = ({
  onSelecionarEvento,
  tipoInicial,
}: SelecionarEventoProps) => {
  const theme = useAppTheme();
  const [tipoSelecionado, setTipoSelecionado] = React.useState<
    EnumTipoEvento | undefined
  >(tipoInicial);

  return (
    <Tela scroll>
      <VStack flex={1} gap={24}>
        <VStack gap={4}>
          <Text variant="titleLarge">Selecionar o tipo de evento</Text>
          <Text
            variant="bodyMedium"
            style={{color: theme.colors.onSurfaceVariant}}>
            Escolha o que está acontecendo com o pedido antes de aproximar a
            etiqueta.
          </Text>
        </VStack>

        <VStack gap={12}>
          {TIPOS_SELECIONAVEIS.map(tipo => (
            <ItemOpcao
              key={tipo}
              tipo={tipo}
              selecionada={tipo === tipoSelecionado}
              onSelecionar={setTipoSelecionado}
            />
          ))}
        </VStack>

        <Botao
          onPress={() => tipoSelecionado && onSelecionarEvento(tipoSelecionado)}
          disabled={!tipoSelecionado}>
          Continuar
        </Botao>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  toque: {
    borderRadius: 8,
  },
});

export default SelecionarEvento;
