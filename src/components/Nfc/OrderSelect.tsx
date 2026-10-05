import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Button,
  Card,
  RadioButton,
  Searchbar,
  Text,
} from 'react-native-paper';
import type {OrderSummary} from '../../appplication/traceability/workflow';
import {traceability} from '../../infra/traceability/runtime';
import VStack from '../Base/VStack';

export default function OrderSelect({
  selected,
  disabled,
  onSelect,
}: {
  selected?: OrderSummary;
  disabled: boolean;
  onSelect: (order?: OrderSummary) => void;
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
    <Card mode="outlined">
      <Card.Content>
        <VStack gap={12}>
          <Text variant="titleMedium">1. Escolha o pedido</Text>
          {selected ? (
            <>
              <Text variant="titleLarge">{selected.codigo}</Text>
              {!!selected.descricao && <Text>{selected.descricao}</Text>}
              <Text>Esta etiqueta representará um volume deste pedido.</Text>
              {!disabled && (
                <Button onPress={() => onSelect(undefined)}>
                  Trocar pedido
                </Button>
              )}
            </>
          ) : (
            <>
              <Text>
                Selecione um pedido cadastrado. Pedidos que já avançaram na
                logística não podem receber uma nova etiqueta.
              </Text>
              <Searchbar
                placeholder="Buscar pedido por código ou descrição"
                value={search}
                onChangeText={setSearch}
                editable={!disabled}
              />
              {orders.map(order => (
                <RadioButton.Item
                  key={order.id}
                  label={`${order.codigo}${
                    order.descricao ? ` · ${order.descricao}` : ''
                  }${
                    order.estado !== 'CADASTRADO'
                      ? ` (${order.estado.toLowerCase()})`
                      : ''
                  }`}
                  value={order.id}
                  status="unchecked"
                  position="leading"
                  disabled={disabled || order.estado !== 'CADASTRADO'}
                  onPress={() => onSelect(order)}
                />
              ))}
              {busy && (
                <ActivityIndicator accessibilityLabel="Carregando pedidos" />
              )}
              {!busy && !error && orders.length === 0 && (
                <Text>
                  Nenhum pedido encontrado. Ajuste a busca ou cadastre um pedido
                  no servidor.
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
      </Card.Content>
    </Card>
  );
}
