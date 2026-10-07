import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';

import Tela from '../../../../components/Base/Tela';
import {
  FlowSteps,
  PageHero,
  trackingColors as colors,
} from '../../../../components/Tracking';
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
      accessibilityState={{checked: selecionada}}>
      <View
        style={[
          styles.option,
          selecionada ? styles.selected : styles.unselected,
        ]}>
        <HStack gap={12} align="center">
          <Icon source={icone} size={32} color={cor} />

          <VStack flex={1} gap={2}>
            <Text variant="titleMedium" style={styles.optionTitle}>
              {descricaoEnumTipoEvento[tipo]}
            </Text>
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
      </View>
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
  const [tipoSelecionado, setTipoSelecionado] = React.useState<
    EnumTipoEvento | undefined
  >(tipoInicial);

  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          compact
          title="O que aconteceu com o pedido?"
          description="Escolha a etapa antes de aproximar a etiqueta."
          icon="timeline-plus-outline"
          eyebrow="PASSO 1 · ESCOLHER ETAPA"
        />
      }
      footer={
        <Botao
          onPress={() => tipoSelecionado && onSelecionarEvento(tipoSelecionado)}
          disabled={!tipoSelecionado}>
          Continuar
        </Botao>
      }>
      <VStack gap={16}>
        <FlowSteps labels={['Escolher', 'Ler', 'Confirmar']} current={1} />

        <VStack gap={8}>
          {TIPOS_SELECIONAVEIS.map(tipo => (
            <ItemOpcao
              key={tipo}
              tipo={tipo}
              selecionada={tipo === tipoSelecionado}
              onSelecionar={setTipoSelecionado}
            />
          ))}
        </VStack>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  toque: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  option: {padding: 14, minHeight: 84},
  optionTitle: {fontWeight: '700'},
  selected: {backgroundColor: colors.pale},
  unselected: {backgroundColor: 'white'},
});

export default SelecionarEvento;
