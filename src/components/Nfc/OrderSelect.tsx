import {useOrderSearch} from './use-order-search';
import {FlatList, StyleSheet} from 'react-native';
import Tela from '../Base/Tela';
import {PageHero} from '../Tracking';
import {ActionButton as Button} from '../Tracking';
import React from 'react';
import {
  ActivityIndicator,
  Icon,
  Searchbar,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import type {OrderSummary} from '../../appplication/traceability/contracts/order.types';
import VStack from '../Base/VStack';
import {View} from 'react-native';
import {stateLabel} from '../Tracking/labels';
import {trackingColors as colors} from '../Tracking';

export function OrderOption({
  order,
  disabled,
  onPress,
}: {
  order: OrderSummary;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{disabled}}
      accessibilityLabel={`${order.codigo}${
        order.descricao ? ` · ${order.descricao}` : ''
      } · ${stateLabel(order.estado)}`}
      style={layoutStyles.orderRow}>
      <View style={layoutStyles.orderContent}>
        <View style={layoutStyles.orderIcon}>
          <Icon
            source="package-variant-closed"
            size={26}
            color={disabled ? colors.muted : colors.blue}
          />
        </View>
        <View style={layoutStyles.orderText}>
          <Text style={layoutStyles.orderCode}>{order.codigo}</Text>
          {!!order.descricao && (
            <Text style={layoutStyles.description}>{order.descricao}</Text>
          )}
          <Text
            style={[
              layoutStyles.state,
              {color: disabled ? colors.muted : colors.blue},
            ]}>
            {stateLabel(order.estado)}
          </Text>
        </View>
        <Icon
          source={disabled ? 'lock-outline' : 'chevron-right'}
          size={22}
          color={colors.muted}
        />
      </View>
    </TouchableRipple>
  );
}

export default function OrderSelect({
  selected,
  disabled,
  onSelect,
  purpose = 'provisioning',
  onCreate,
  pickerHeader,
  pickerFooter,
  insetTop = true,
}: {
  selected?: OrderSummary;
  disabled: boolean;
  onSelect: (order?: OrderSummary) => void;
  purpose?: 'provisioning' | 'history';
  onCreate?: () => void;
  pickerHeader?: React.ReactNode;
  pickerFooter?: React.ReactNode;
  insetTop?: boolean;
}) {
  const {search, setSearch, orders, page, total, busy, error, retry, loadMore} =
    useOrderSearch(!selected);
  if (selected)
    return (
      <View>
        <VStack gap={12}>
          <Text variant="titleMedium">Pedido</Text>
          <Text variant="titleLarge" style={layoutStyles.orderCode}>
            {selected.codigo}
          </Text>
          {!!selected.descricao && <Text>{selected.descricao}</Text>}
          {!disabled && (
            <Button onPress={() => onSelect(undefined)}>Trocar pedido</Button>
          )}
        </VStack>
      </View>
    );
  return (
    <Tela
      keyboard
      insetTop={insetTop}
      footer={pickerFooter}
      header={
        <PageHero
          fullBleed
          title={purpose === 'history' ? 'Rastrear pedido' : 'Escolher pedido'}
          description={
            purpose === 'history'
              ? 'Leia a etiqueta ou busque pelo código.'
              : 'Selecione o pedido deste volume.'
          }
          icon="package-variant-closed"
        />
      }
      renderContent={({header, contentStyle}) => (
        <FlatList
          data={orders}
          keyExtractor={order => order.id}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <VStack gap={12}>
              {header}
              {pickerHeader}
              <Text variant="titleMedium">
                {purpose === 'history' ? 'Ou busque pelo pedido' : 'Pedido'}
              </Text>
              <Searchbar
                placeholder="Buscar pedido"
                value={search}
                onChangeText={setSearch}
                editable={!disabled}
                style={layoutStyles.search}
              />
              {purpose === 'provisioning' && onCreate && (
                <Button icon="plus" disabled={disabled} onPress={onCreate}>
                  Novo pedido
                </Button>
              )}
              {!busy && total > 0 && (
                <Text variant="bodySmall" style={layoutStyles.description}>
                  {total} pedido(s) encontrado(s)
                </Text>
              )}
            </VStack>
          }
          renderItem={({item: order}) => (
            <OrderOption
              order={order}
              disabled={
                disabled ||
                (purpose === 'provisioning' && order.estado !== 'CADASTRADO')
              }
              onPress={() => onSelect(order)}
            />
          )}
          ListFooterComponent={
            <VStack gap={12}>
              {busy && (
                <ActivityIndicator accessibilityLabel="Carregando pedidos" />
              )}
              {!busy && !error && orders.length === 0 && (
                <Text>
                  Nenhum pedido encontrado. Ajuste a busca
                  {onCreate ? ' ou toque em Novo pedido.' : '.'}
                </Text>
              )}
              {!!error && (
                <>
                  <Text accessibilityRole="alert">{error}</Text>
                  <Button
                    disabled={busy}
                    onPress={() => {
                      if (page === 0) retry();
                      else void loadMore();
                    }}>
                    Tentar novamente
                  </Button>
                </>
              )}
              {page > 0 && page * 10 < total && !error && (
                <Button
                  disabled={busy}
                  onPress={() => {
                    void loadMore();
                  }}>
                  Carregar mais pedidos
                </Button>
              )}
            </VStack>
          }
        />
      )}
    />
  );
}

const layoutStyles = StyleSheet.create({
  orderRow: {
    minHeight: 96,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: 'white',
  },
  orderContent: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {flex: 1, minWidth: 0, gap: 4},
  orderCode: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.navy,
  },
  description: {fontSize: 14, lineHeight: 21, color: colors.muted},
  state: {fontSize: 13, lineHeight: 20, fontWeight: '600'},
  search: {backgroundColor: colors.background, borderRadius: 18},
});
