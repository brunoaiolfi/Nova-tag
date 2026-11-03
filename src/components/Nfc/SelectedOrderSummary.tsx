import React from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import type {OrderSummary} from '../../appplication/traceability/contracts/order.types';
import VStack from '../Base/VStack';
import {ActionButton} from '../Tracking';
import {palette} from '../../theme/tokens';

/** Inline summary only: the full-screen order picker owns its own scrolling. */
export default function SelectedOrderSummary({
  order,
  disabled,
  onChange,
}: {
  order: OrderSummary;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <VStack gap={12}>
      <Text variant="titleMedium">Pedido</Text>
      <Text variant="titleLarge" style={styles.code}>
        {order.codigo}
      </Text>
      {!!order.descricao && <Text>{order.descricao}</Text>}
      {!disabled && (
        <ActionButton onPress={onChange}>Trocar pedido</ActionButton>
      )}
    </VStack>
  );
}

const styles = StyleSheet.create({
  code: {fontSize: 18, lineHeight: 25, fontWeight: '700', color: palette.navy},
});
