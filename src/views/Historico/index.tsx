import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../components/Tracking';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  List,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import type {RotasTab} from '../../navigation';
import type {
  HistoryEntry,
  OrderDetails,
  OrderSummary,
  Provisioning,
  Reading,
} from '../../appplication/traceability/workflow';
import {traceability} from '../../infra/traceability/runtime';
import {useSession} from '../../components/Auth/SessionProvider';
import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import OrderSelect from '../../components/Nfc/OrderSelect';
import Leitor from '../../components/Nfc/Leitor';
import {View} from 'react-native';
import {OrderJourney, PageHero, StatusPanel} from '../../components/Tracking';
import {HistoryItem} from '../../components/Tracking/HistoryTimeline';

type Target =
  | {kind: 'tag'; reading: Reading}
  | {kind: 'order'; order: OrderSummary};
type Context = {order: OrderDetails; provisioning?: Provisioning};
export {HistoryItem} from '../../components/Tracking/HistoryTimeline';

export default function Historico() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RotasTab, 'Historico'>>();
  const params = useRoute<RouteProp<RotasTab, 'Historico'>>().params;
  const {state} = useSession();
  const [target, setTarget] = useState<Target>();
  const [context, setContext] = useState<Context>();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [scope, setScope] = useState('vinculo');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const generation = useRef(0);
  const running = useRef(false);

  const choose = useCallback((value?: Target) => {
    setTarget(value);
    setContext(undefined);
    setEntries([]);
    setMessage('');
    setNextPage(null);
    setScope(value?.kind === 'tag' ? 'vinculo' : 'pedido');
  }, []);
  useEffect(() => {
    if (params?.reading) {
      choose({kind: 'tag', reading: params.reading});
      setScanning(false);
      navigation.setParams({reading: undefined});
    }
  }, [params?.reading, navigation, choose]);

  useFocusEffect(
    useCallback(() => {
      if (!target || scanning || state.status !== 'authenticated') {
        return;
      }
      const token = ++generation.current;
      const selection = target;
      running.current = true;
      setBusy(true);
      setMessage('');
      setEntries([]);
      setNextPage(null);
      async function load() {
        try {
          let provisioning: Provisioning | undefined;
          let orderId: string;
          if (selection.kind === 'tag') {
            provisioning = await traceability.resolveProvisioning(
              selection.reading,
            );
            orderId = provisioning.pedidoId;
          } else {
            orderId = selection.order.id;
          }
          if (generation.current !== token) {
            return;
          }
          const order = await traceability.order(orderId);
          if (selection.kind === 'order') {
            provisioning = order.provisionamentoVigente ?? undefined;
          }
          if (generation.current !== token) {
            return;
          }
          const history = await traceability.history(
            order.id,
            1,
            scope === 'vinculo' ? provisioning?.id : undefined,
          );
          if (generation.current === token) {
            setContext({order, provisioning});
            setEntries(history.itens);
            setNextPage(history.proximaPagina);
            setTotal(history.totalDoPedido);
          }
        } catch (error) {
          if (generation.current === token) {
            setMessage(
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar o histórico.',
            );
          }
        } finally {
          if (generation.current === token) {
            running.current = false;
            setBusy(false);
          }
        }
      }
      void load();
      return () => {
        generation.current = token + 1;
      };
    }, [target, scanning, scope, state.status]),
  );

  async function more() {
    if (!context || nextPage === null || running.current) {
      return;
    }
    const token = generation.current;
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      const history = await traceability.history(
        context.order.id,
        nextPage,
        scope === 'vinculo' ? context.provisioning?.id : undefined,
      );
      if (generation.current === token) {
        setEntries(current => [
          ...current,
          ...history.itens.filter(
            item => !current.some(existing => existing.id === item.id),
          ),
        ]);
        setNextPage(history.proximaPagina);
        setTotal(history.totalDoPedido);
      }
    } catch (error) {
      if (generation.current === token) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar mais registros.',
        );
      }
    } finally {
      if (generation.current === token) {
        running.current = false;
        setBusy(false);
      }
    }
  }

  if (scanning) {
    return (
      <Leitor
        context="Consultar histórico · sem gravar na etiqueta"
        continueLabel="Ver histórico desta etiqueta"
        onVoltar={() => setScanning(false)}
        onErroLeitura={() => {}}
        onLeituraRealizada={reading => {
          choose({kind: 'tag', reading});
          setScanning(false);
        }}
      />
    );
  }
  return (
    <Tela
      scroll
      header={
        context ? (
          <OrderJourney order={context.order} fullBleed />
        ) : (
          <PageHero
            fullBleed
            title="Onde está o pedido no trajeto?"
            description="Consulte a situação atual e acompanhe cada etapa registrada."
            icon="map-marker-path"
            eyebrow="RASTREAR PEDIDO"
          />
        )
      }>
      <VStack gap={16}>
        {!target && (
          <>
            <Button
              mode="contained"
              icon="nfc-search-variant"
              onPress={() => setScanning(true)}>
              Ler etiqueta para ver histórico
            </Button>
            <OrderSelect
              purpose="history"
              disabled={false}
              onSelect={order => order && choose({kind: 'order', order})}
            />
          </>
        )}
        {context?.provisioning && (
          <Text variant="bodySmall">
            {context.provisioning.status === 'ATIVA'
              ? 'Etiqueta cadastrada: ativa neste pedido.'
              : context.provisioning.status === 'REGISTRADA'
              ? 'Esta etiqueta aguarda ativação e ainda não pode registrar etapas.'
              : 'O vínculo desta etiqueta foi encerrado. Seu histórico está preservado.'}
          </Text>
        )}
        {context?.provisioning &&
          target?.kind === 'tag' &&
          target.reading.uid !== context.provisioning.uid && (
            <StatusPanel tone="warning">
              <Text>
                A referência NDEF aponta para este vínculo, mas o UID lido é
                diferente: {target.reading.uid}. Esta consulta não autentica a
                etiqueta.
              </Text>
            </StatusPanel>
          )}
        {target?.kind === 'tag' && (
          <SegmentedButtons
            value={scope}
            onValueChange={setScope}
            buttons={[
              {value: 'vinculo', label: 'Esta etiqueta', disabled: busy},
              {value: 'pedido', label: 'Pedido completo', disabled: busy},
            ]}
          />
        )}
        {context && (
          <VStack gap={8}>
            <Text variant="titleLarge" style={layoutStyles.sectionTitle}>
              Caminho do pedido
            </Text>
            <Text variant="bodySmall">
              Do primeiro ao mais recente, na ordem de recebimento pelo
              servidor. Tentativas rejeitadas não avançam o pedido.
            </Text>
            <Text variant="bodySmall">
              {scope === 'vinculo'
                ? `${entries.length} registro(s) deste vínculo carregado(s)`
                : `${total} registro(s) no pedido`}
            </Text>
            {context.provisioning && (
              <List.Accordion
                title="Sobre a etiqueta deste pedido"
                titleNumberOfLines={2}
                titleStyle={layoutStyles.detailsTitle}>
                <View style={layoutStyles.details}>
                  <Text selectable>
                    Etiqueta cadastrada: {context.provisioning.uid}
                  </Text>
                  <Text>
                    Vínculo{' '}
                    {context.provisioning.epoca
                      ? `· época ${context.provisioning.epoca}`
                      : ''}
                    :{' '}
                    {context.provisioning.status === 'ATIVA'
                      ? 'Ativo'
                      : context.provisioning.status === 'REGISTRADA'
                      ? 'Aguardando ativação'
                      : 'Encerrado'}
                  </Text>
                  <Text>
                    Identificação por{' '}
                    {context.provisioning.estrategia === 'UID'
                      ? 'UID'
                      : context.provisioning.estrategia === 'SDM'
                      ? 'SDM (validação no servidor)'
                      : 'referência NDEF'}
                    .
                  </Text>
                  {state.session?.user.perfil === 'ADMINISTRADOR' && (
                    <Button
                      mode="outlined"
                      disabled={busy}
                      onPress={() =>
                        navigation.navigate('Provisionar', {
                          screen: 'Gerenciar',
                          params: {provisioningId: context.provisioning?.id},
                        })
                      }>
                      Gerenciar este vínculo
                    </Button>
                  )}
                </View>
              </List.Accordion>
            )}
          </VStack>
        )}
        {busy && (
          <ActivityIndicator accessibilityLabel="Carregando histórico" />
        )}
        {!!message && (
          <>
            <Text accessibilityRole="alert">{message}</Text>
            <Button
              disabled={busy}
              onPress={() => {
                if (nextPage !== null) {
                  void more();
                } else {
                  setTarget(value => (value ? {...value} : value));
                }
              }}>
              Tentar novamente
            </Button>
          </>
        )}
        {!busy && !message && context && entries.length === 0 && (
          <Text>
            Nenhum registro encontrado{' '}
            {scope === 'vinculo' ? 'neste vínculo' : 'neste pedido'}.
          </Text>
        )}
        <View>
          {entries.map((entry, index) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              isLast={index === entries.length - 1 && nextPage === null}
              anotherLink={
                !!context?.provisioning &&
                entry.provisionamentoId !== context.provisioning.id
              }
            />
          ))}
        </View>
        {nextPage !== null && (
          <Button
            disabled={busy}
            onPress={() => {
              void more();
            }}>
            Carregar mais registros
          </Button>
        )}
        {target && (
          <VStack gap={8}>
            <Button
              mode="outlined"
              icon="refresh"
              disabled={busy}
              onPress={() => setTarget(value => (value ? {...value} : value))}>
              Atualizar histórico
            </Button>
            <Button icon="magnify" disabled={busy} onPress={() => choose()}>
              Consultar outro pedido
            </Button>
            <Button icon="nfc-search-variant" onPress={() => setScanning(true)}>
              Ler outra etiqueta
            </Button>
          </VStack>
        )}
      </VStack>
    </Tela>
  );
}

const layoutStyles = StyleSheet.create({
  sectionTitle: {fontWeight: '700'},
  detailsTitle: {fontSize: 15, fontWeight: '600'},
  details: {gap: 10, padding: 12},
});
