import {showCommandFailure} from '../Base/Toast/service';
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
  unavailableReason,
}: {
  order: OrderSummary;
  disabled: boolean;
  onPress: () => void;
  unavailableReason?: string | undefined;
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{disabled}}
      {...(unavailableReason ? {accessibilityHint: unavailableReason} : {})}
      accessibilityLabel={`${order.codigo}${
        order.descricao ? ` · ${order.descricao}` : ''
      } · ${stateLabel(order.estado)}`}
      style={layoutStyles.orderRow}>
      <View style={layoutStyles.orderContent}>
        <View style={layoutStyles.orderHeading}>
          <View style={layoutStyles.orderIcon}>
            <Icon
              source="package-variant-closed"
              size={26}
              color={disabled ? colors.muted : colors.blue}
            />
          </View>
          <View
            style={[
              layoutStyles.stateBadge,
              disabled && layoutStyles.unavailableBadge,
            ]}>
            <Text
              style={[
                layoutStyles.state,
                {color: disabled ? colors.muted : colors.blue},
              ]}>
              {stateLabel(order.estado)}
            </Text>
          </View>
          <View style={layoutStyles.trailingIcon}>
            <Icon
              source={disabled ? 'lock-outline' : 'chevron-right'}
              size={20}
              color={disabled ? colors.muted : colors.blue}
            />
          </View>
        </View>
        <View style={layoutStyles.orderText}>
          <Text style={layoutStyles.orderCode}>{order.codigo}</Text>
          {!!order.descricao && (
            <Text style={layoutStyles.description}>{order.descricao}</Text>
          )}
          {!!unavailableReason && (
            <Text style={layoutStyles.unavailableReason}>
              {unavailableReason}
            </Text>
          )}
        </View>
      </View>
    </TouchableRipple>
  );
}

export default function OrderSelect({
  disabled,
  onSelect,
  purpose = 'provisioning',
  onCreate,
  pickerHeader,
  pickerFooter,
  insetTop = true,
}: {
  disabled: boolean;
  onSelect: (order: OrderSummary) => void;
  purpose?: ('provisioning' | 'history') | undefined;
  onCreate?: (() => void) | undefined;
  pickerHeader?: React.ReactNode | undefined;
  pickerFooter?: React.ReactNode | undefined;
  insetTop?: boolean | undefined;
}) {
  const {search, setSearch, orders, page, total, busy, error, retry, loadMore} =
    useOrderSearch();
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
              : 'Selecione um pedido cadastrado para vincular.'
          }
          icon="package-variant-closed"
        />
      }
      renderContent={({header, contentStyle}) => (
        <FlatList
          testID="order-search-results"
          style={layoutStyles.list}
          data={orders}
          keyExtractor={order => order.id}
          contentContainerStyle={[contentStyle, layoutStyles.listContent]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View>
              {header}
              <VStack gap={12} style={layoutStyles.searchSection}>
                {pickerHeader}
                <Searchbar
                  placeholder="Buscar pedido"
                  accessibilityLabel="Buscar pedido"
                  value={search}
                  onChangeText={setSearch}
                  editable={!disabled}
                  elevation={0}
                  style={layoutStyles.search}
                />
                {purpose === 'provisioning' && onCreate && (
                  <Button
                    mode="outlined"
                    icon="plus"
                    disabled={disabled}
                    onPress={onCreate}>
                    Novo pedido
                  </Button>
                )}
                {!busy && total > 0 && (
                  <Text variant="bodySmall" style={layoutStyles.description}>
                    {total}{' '}
                    {total === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                  </Text>
                )}
              </VStack>
            </View>
          }
          renderItem={({item: order}) => (
            <OrderOption
              order={order}
              disabled={
                disabled ||
                (purpose === 'provisioning' && order.estado !== 'CADASTRADO')
              }
              unavailableReason={
                purpose === 'provisioning' && order.estado !== 'CADASTRADO'
                  ? 'Novo vínculo indisponível neste estado'
                  : undefined
              }
              onPress={() => onSelect(order)}
            />
          )}
          ListFooterComponent={
            <VStack gap={12} style={layoutStyles.listFooter}>
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
                      else loadMore().catch(showCommandFailure);
                    }}>
                    Tentar novamente
                  </Button>
                </>
              )}
              {page > 0 && page * 10 < total && !error && (
                <Button
                  disabled={busy}
                  onPress={() => {
                    loadMore().catch(showCommandFailure);
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
  list: {backgroundColor: 'white'},
  listContent: {paddingHorizontal: 0, paddingTop: 0},
  searchSection: {
    padding: 16,
    paddingBottom: 20,
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
  },
  listFooter: {paddingHorizontal: 16, paddingBottom: 12},
  orderRow: {
    minHeight: 96,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: colors.line,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  orderContent: {
    padding: 16,
    gap: 12,
  },
  orderHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {minWidth: 0, gap: 6},
  orderCode: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  stateBadge: {
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.pale,
  },
  unavailableBadge: {backgroundColor: colors.background},
  unavailableReason: {fontSize: 12, lineHeight: 18, color: colors.muted},
  trailingIcon: {marginLeft: 'auto'},
  description: {fontSize: 14, lineHeight: 21, color: colors.muted},
  state: {fontSize: 13, lineHeight: 20, fontWeight: '600'},
  search: {backgroundColor: colors.background, borderRadius: 18},
});
