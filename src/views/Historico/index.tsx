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
  Button,
  Card,
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
import {eventLabel, reasonLabel, stateLabel} from '../traceability-labels';

type Target =
  | {kind: 'tag'; reading: Reading}
  | {kind: 'order'; order: OrderSummary};
type Context = {order: OrderDetails; provisioning?: Provisioning};
const date = (value: string) => new Date(value).toLocaleString('pt-BR');

export function HistoryItem({
  entry,
  anotherLink,
}: {
  entry: HistoryEntry;
  anotherLink: boolean;
}) {
  const decision = entry.decisao;
  return (
    <Card mode="outlined">
      <Card.Content>
        <VStack gap={8}>
          <Text variant="titleLarge">{eventLabel(entry.tipo)}</Text>
          <Text variant="titleMedium">
            {decision.autorizada
              ? 'Operação autorizada'
              : 'Operação rejeitada · pedido não alterado'}
          </Text>
          {decision.classificacao === 'SUSPEITO' && (
            <Text>Leitura suspeita · divergências identificadas</Text>
          )}
          <Text>{reasonLabel(decision.motivo)}</Text>
          <Text>
            {decision.alterouEstado
              ? `${stateLabel(decision.estadoAnterior)} → ${stateLabel(
                  decision.estadoResultante,
                )}`
              : `Estado mantido: ${stateLabel(decision.estadoResultante)}`}
          </Text>
          <Text>Recebido pelo servidor: {date(entry.recebidoEm)}</Text>
          <Text>
            {entry.origem === 'SISTEMA'
              ? 'Horário da ativação'
              : 'Horário declarado pelo aparelho'}
            : {date(entry.ocorridoEm)}
          </Text>
          {anotherLink && <Text>Outro vínculo deste pedido</Text>}
          <List.Accordion title="Detalhes do registro">
            <Text>
              Origem:{' '}
              {entry.origem === 'SISTEMA'
                ? 'Ativação da etiqueta pelo sistema'
                : 'Captura enviada pelo aplicativo'}
            </Text>
            <Text>
              Classificação:{' '}
              {decision.classificacao === 'SUSPEITO' ? 'Suspeito' : 'Regular'}
            </Text>
            {!!entry.autoria && (
              <Text>
                Autoria:{' '}
                {entry.autoria.tipo === 'AUTENTICADA'
                  ? 'Operador autenticado'
                  : 'Informação declarada'}
              </Text>
            )}
            {!!entry.autoria?.usuarioId && (
              <Text selectable>
                Identificador do operador: {entry.autoria.usuarioId}
              </Text>
            )}
            {decision.avisos.map((warning, index) => (
              <Text key={`${warning}-${index}`}>{reasonLabel(warning)}</Text>
            ))}
            <Text selectable>Registro: {entry.id}</Text>
            <Text selectable>Vínculo: {entry.provisionamentoId}</Text>
            <Text>Motivo: {decision.motivo}</Text>
          </List.Accordion>
        </VStack>
      </Card.Content>
    </Card>
  );
}

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
    <Tela scroll>
      <VStack gap={16}>
        <Text variant="headlineSmall">Histórico</Text>
        <Text>
          Consulte as operações salvas no servidor, inclusive as tentativas
          rejeitadas.
        </Text>
        <Button mode="contained" onPress={() => setScanning(true)}>
          Ler etiqueta para ver histórico
        </Button>
        {!target && (
          <OrderSelect
            purpose="history"
            disabled={false}
            onSelect={order => order && choose({kind: 'order', order})}
          />
        )}
        {target && (
          <>
            <Button disabled={busy} onPress={() => choose()}>
              Consultar outro pedido
            </Button>
            <Button
              disabled={busy}
              onPress={() => setTarget(value => (value ? {...value} : value))}>
              Atualizar histórico
            </Button>
          </>
        )}
        {target?.kind === 'tag' && (
          <SegmentedButtons
            value={scope}
            onValueChange={setScope}
            buttons={[
              {value: 'vinculo', label: 'Vínculo lido', disabled: busy},
              {value: 'pedido', label: 'Todo pedido', disabled: busy},
            ]}
          />
        )}
        {context && (
          <Card mode="outlined">
            <Card.Content>
              <VStack gap={8}>
                <Text variant="titleLarge">Pedido {context.order.codigo}</Text>
                {!!context.order.descricao && (
                  <Text>{context.order.descricao}</Text>
                )}
                <Text>
                  Estado atual: {stateLabel(context.order.estado)}
                  {context.order.expedido ? ' · expedição registrada' : ''}
                </Text>
                {context.provisioning && (
                  <>
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
                        : 'referência NDEF'}
                      .
                    </Text>
                    {target?.kind === 'tag' &&
                      target.reading.uid !== context.provisioning.uid && (
                        <Text>
                          A referência NDEF aponta para este vínculo, mas o UID
                          lido é diferente: {target.reading.uid}. Esta consulta
                          não autentica a etiqueta.
                        </Text>
                      )}
                  </>
                )}
                <Text>
                  {scope === 'vinculo'
                    ? `${entries.length} registro(s) deste vínculo carregado(s)`
                    : `${total} registro(s) no pedido`}
                </Text>
                <Text variant="bodySmall">
                  Do primeiro ao mais recente, pela ordem de recebimento no
                  servidor. O horário do aparelho aparece separadamente.
                </Text>
              </VStack>
            </Card.Content>
          </Card>
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
        {entries.map(entry => (
          <HistoryItem
            key={entry.id}
            entry={entry}
            anotherLink={
              !!context?.provisioning &&
              entry.provisionamentoId !== context.provisioning.id
            }
          />
        ))}
        {nextPage !== null && (
          <Button
            disabled={busy}
            onPress={() => {
              void more();
            }}>
            Carregar mais registros
          </Button>
        )}
      </VStack>
    </Tela>
  );
}
