import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../Tracking';
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Icon,
  Searchbar,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import type {OrderSummary} from '../../appplication/traceability/workflow';
import {traceability} from '../../infra/traceability/runtime';
import VStack from '../Base/VStack';
import {View} from 'react-native';
import {stateLabel} from '../../views/traceability-labels';
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
      accessibilityRole="radio"
      accessibilityState={{checked: false, disabled}}
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
}: {
  selected?: OrderSummary;
  disabled: boolean;
  onSelect: (order?: OrderSummary) => void;
  purpose?: 'provisioning' | 'history';
  onCreate?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const loading = useRef(false);

  useEffect(() => {
    const token = ++generation.current;
    loading.current = true;
    setBusy(true);
    setOrders([]);
    setPage(0);
    setTotal(0);
    setError('');
    const timer = setTimeout(() => {
      traceability
        .listOrders(search)
        .then(result => {
          if (generation.current === token) {
            setOrders(result.itens);
            setTotal(result.total);
            setPage(1);
          }
        })
        .catch(reason => {
          if (generation.current === token) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Não foi possível carregar os pedidos.',
            );
          }
        })
        .finally(() => {
          if (generation.current === token) {
            loading.current = false;
            setBusy(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      generation.current = token + 1;
    };
  }, [search, retry]);

  async function loadMore() {
    if (loading.current) {
      return;
    }
    const token = generation.current;
    loading.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await traceability.listOrders(search, page + 1);
      if (generation.current === token) {
        setOrders(current => [
          ...current,
          ...result.itens.filter(
            item => !current.some(existing => existing.id === item.id),
          ),
        ]);
        setTotal(result.total);
        setPage(page + 1);
      }
    } catch (reason) {
      if (generation.current === token) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível carregar mais pedidos.',
        );
      }
    } finally {
      if (generation.current === token) {
        loading.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <View>
      <VStack gap={12}>
        <Text variant="titleMedium">
          {purpose === 'history'
            ? 'Ou busque pelo pedido'
            : '1. Escolha o pedido'}
        </Text>
        {selected ? (
          <>
            <Text variant="titleLarge" style={layoutStyles.orderCode}>
              {selected.codigo}
            </Text>
            {!!selected.descricao && <Text>{selected.descricao}</Text>}
            <Text>
              {purpose === 'history'
                ? 'O histórico inclui todos os vínculos deste pedido.'
                : 'Esta etiqueta representará um volume deste pedido.'}
            </Text>
            {!disabled && (
              <Button onPress={() => onSelect(undefined)}>Trocar pedido</Button>
            )}
          </>
        ) : (
          <>
            <Text>
              {purpose === 'history'
                ? 'Toque em um pedido para abrir seu caminho.'
                : 'Escolha um pedido que ainda não iniciou o trajeto.'}
            </Text>
            <Searchbar
              placeholder="Buscar pedido por código ou descrição"
              value={search}
              onChangeText={setSearch}
              editable={!disabled}
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
                {total} pedido(s) encontrado(s)
              </Text>
            )}
            {orders.map(order => (
              <OrderOption
                key={order.id}
                order={order}
                disabled={
                  disabled ||
                  (purpose === 'provisioning' && order.estado !== 'CADASTRADO')
                }
                onPress={() => onSelect(order)}
              />
            ))}
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
                    if (page === 0) {
                      setRetry(value => value + 1);
                    } else {
                      void loadMore();
                    }
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
          </>
        )}
      </VStack>
    </View>
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
