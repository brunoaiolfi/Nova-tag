import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ActivityIndicator, Checkbox, List, Text} from 'react-native-paper';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import type {
  OrderDetails,
  Provisioning,
  Reading,
} from '../../../appplication/traceability/workflow';
import {traceability} from '../../../infra/traceability/runtime';
import {physicalNfcAvailable} from '../../../infra/nfc/reader';
import {useSession} from '../../../components/Auth/SessionProvider';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import Leitor from '../../../components/Nfc/Leitor';
import {
  ActionButton,
  PageHero,
  StatusPanel,
} from '../../../components/Tracking';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import {stateLabel} from '../../traceability-labels';

type Selection = {id: string} | {reading: Reading};
type Context = {provisioning: Provisioning; order: OrderDetails};
export default function Gerenciar() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const params = useRoute<RouteProp<RotasProvisionar, 'Gerenciar'>>().params;
  const {state} = useSession();
  const canManage =
    state.status === 'authenticated' &&
    state.session.user.perfil === 'ADMINISTRADOR';
  const [selection, setSelection] = useState<Selection>();
  const [context, setContext] = useState<Context>();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const closing = useRef(false);
  useEffect(() => {
    if (params?.provisioningId) {
      setSelection({id: params.provisioningId});
    }
  }, [params?.provisioningId]);
  useFocusEffect(
    useCallback(() => {
      const token = ++generation.current;
      if (!selection || !canManage || scanning) {
        return;
      }
      const target = selection;
      setBusy(true);
      setContext(undefined);
      setConfirming(false);
      setConfirmed(false);
      setMessage('');
      async function load() {
        try {
          const provisioning =
            'id' in target
              ? await traceability.provisioning(target.id)
              : await traceability.tag(target.reading.uid);
          if (generation.current !== token) {
            return;
          }
          if (!provisioning) {
            setMessage(
              'Esta etiqueta ainda não possui vínculo. Você pode vinculá-la a um pedido pela aba Vincular.',
            );
            return;
          }
          const order = await traceability.order(provisioning.pedidoId);
          if (generation.current === token) {
            setContext({provisioning, order});
          }
        } catch (error) {
          if (generation.current === token) {
            setMessage(
              error instanceof Error
                ? error.message
                : 'Não foi possível consultar o vínculo.',
            );
          }
        } finally {
          if (generation.current === token) {
            setBusy(false);
          }
        }
      }
      void load();
      return () => {
        generation.current++;
      };
    }, [selection, canManage, scanning]),
  );

  async function close() {
    if (
      !context ||
      !canManage ||
      !state.session ||
      !confirmed ||
      closing.current ||
      busy
    ) {
      return;
    }
    const token = generation.current;
    const current = context;
    closing.current = true;
    setBusy(true);
    setMessage('');
    try {
      const provisioning = await traceability.closeProvisioning(
        current.provisioning,
        state.session.user.id,
      );
      if (generation.current === token) {
        setContext({...current, provisioning});
        setConfirming(false);
        setConfirmed(false);
        setMessage(
          'Vínculo encerrado no servidor. O histórico foi preservado; esta etiqueta pode receber um novo vínculo.',
        );
      }
    } catch (error) {
      if (generation.current === token) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Encerramento não confirmado. Consulte ou tente novamente.',
        );
      }
    } finally {
      closing.current = false;
      if (generation.current === token) {
        setBusy(false);
      }
    }
  }
  if (scanning && canManage) {
    return (
      <Leitor
        insetTop={false}
        context="Consultar vínculo da etiqueta · sem gravar"
        continueLabel="Consultar vínculo desta etiqueta"
        onVoltar={() => setScanning(false)}
        backLabel="Voltar à consulta"
        onErroLeitura={() => {}}
        onLeituraRealizada={reading => {
          setSelection({reading});
          setScanning(false);
        }}
      />
    );
  }
  const provisioning = context?.provisioning;
  const closed = provisioning?.status === 'DESPROVISIONADA';
  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          compact
          icon="tag-outline"
          eyebrow="GERENCIAR ETIQUETA"
          title={
            closed ? 'Etiqueta liberada.' : 'Confira o vínculo da etiqueta.'
          }
          description="Veja o pedido associado e encerre o vínculo para reutilizar a etiqueta, mantendo os registros anteriores."
        />
      }
      footer={
        context && closed && provisioning.estrategia === 'SDM' ? (
          <Text>
            Uma nova época SDM exige novo provisionamento pela bancada e nova
            configuração física da NTAG 424 DNA.
          </Text>
        ) : context && closed ? (
          <ActionButton
            mode="contained"
            disabled={busy || !canManage}
            onPress={() =>
              navigation.push('EtapasProvisionamento', {
                estrategia:
                  provisioning.estrategia === 'UID'
                    ? EnumEstrategiasNFC.UID
                    : EnumEstrategiasNFC.NDEF_ESTATICO,
                expectedUid: provisioning.uid,
                registeredModel: provisioning.modelo,
              })
            }>
            Vincular a outro pedido
          </ActionButton>
        ) : context && confirming ? (
          <ActionButton
            mode="contained"
            disabled={busy || !canManage || !confirmed}
            loading={busy}
            onPress={() => {
              void close();
            }}>
            Confirmar encerramento
          </ActionButton>
        ) : context ? (
          <ActionButton
            mode="outlined"
            disabled={busy || !canManage}
            onPress={() => {
              setConfirming(true);
              setConfirmed(false);
              setMessage('');
            }}>
            Encerrar vínculo
          </ActionButton>
        ) : (
          <ActionButton
            mode="contained"
            disabled={busy || !canManage || !physicalNfcAvailable}
            onPress={() => setScanning(true)}>
            Ler etiqueta para gerenciar
          </ActionButton>
        )
      }>
      <VStack gap={20}>
        {!canManage && (
          <Text variant="bodyMedium" accessibilityRole="alert">
            Somente um Administrador pode encerrar vínculos.
          </Text>
        )}
        {busy && <ActivityIndicator accessibilityLabel="Consultando vínculo" />}
        {context && provisioning && (
          <>
            <VStack gap={8}>
              <Text variant="labelLarge">PEDIDO ASSOCIADO</Text>
              <Text variant="headlineSmall">{context.order.codigo}</Text>
              {!!context.order.descricao && (
                <Text variant="bodyMedium">{context.order.descricao}</Text>
              )}
              <Text variant="bodyMedium">
                Estado do pedido: {stateLabel(context.order.estado)}
              </Text>
            </VStack>
            <VStack gap={8}>
              <Text variant="titleMedium">Etiqueta {provisioning.uid}</Text>
              {canManage &&
                provisioning.modelo
                  ?.replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase() === 'NTAG424DNA' &&
                provisioning.status !== 'DESPROVISIONADA' && (
                  <ActionButton
                    mode="outlined"
                    disabled={busy}
                    onPress={() =>
                      navigation.push('Administracao', {
                        provisioningId: provisioning.id,
                      })
                    }>
                    Retomar configuração da NTAG 424 DNA
                  </ActionButton>
                )}
              <Text variant="bodyMedium">
                Época {provisioning.epoca ?? 'não informada'} ·{' '}
                {provisioning.estrategia === 'UID'
                  ? 'Identificação por UID'
                  : provisioning.estrategia === 'SDM'
                  ? 'SDM · validação no servidor'
                  : 'Referência NDEF estática'}
              </Text>
              {provisioning.sdm && (
                <Text>
                  Política{' '}
                  {provisioning.sdm.politica === 'ESTRITA'
                    ? 'estrita'
                    : 'de registro tardio'}
                  . Configuração física administrada pela bancada.
                </Text>
              )}
              <StatusPanel
                tone={
                  closed || provisioning.status === 'ATIVA'
                    ? 'success'
                    : 'warning'
                }>
                <Text variant="titleMedium">
                  {closed
                    ? 'Vínculo encerrado'
                    : provisioning.status === 'ATIVA'
                    ? 'Vínculo ativo'
                    : 'Pendente de ativação'}
                </Text>
                <Text variant="bodyMedium">
                  {closed
                    ? 'As novas capturas desse vínculo não autorizam movimentações. O pedido e seu histórico permanecem disponíveis.'
                    : provisioning.status === 'ATIVA'
                    ? 'Esta etiqueta identifica o pedido acima para registrar as etapas do trajeto.'
                    : 'O vínculo foi salvo, mas ainda não aceita operações. Você pode retomar a configuração ou encerrá-lo.'}
                </Text>
              </StatusPanel>
            </VStack>
            {confirming && (
              <VStack gap={12}>
                <Text variant="titleMedium">Encerrar este vínculo?</Text>
                <Text variant="bodyMedium">
                  O vínculo da etiqueta {provisioning.uid} com{' '}
                  {context.order.codigo} deixará de aceitar operações. Isso não
                  conclui a entrega, não apaga o histórico e não remove
                  fisicamente o NDEF.
                </Text>
                <Checkbox.Item
                  label="Conferi o pedido e quero liberar esta etiqueta"
                  status={confirmed ? 'checked' : 'unchecked'}
                  disabled={busy}
                  onPress={() => setConfirmed(!confirmed)}
                />
                <ActionButton
                  mode="outlined"
                  disabled={busy}
                  onPress={() => {
                    setConfirming(false);
                    setConfirmed(false);
                  }}>
                  Manter vínculo
                </ActionButton>
              </VStack>
            )}
            {closed && (
              <Text variant="bodyMedium">
                Na reutilização, escolha um pedido Cadastrado e leia a mesma
                etiqueta novamente. A API criará uma nova época. Para NDEF, será
                necessário gravar e conferir a nova referência.
              </Text>
            )}
            <List.Accordion
              title="Identificadores do vínculo"
              titleNumberOfLines={2}>
              <Text variant="bodyMedium" selectable>
                Provisionamento: {provisioning.id}
              </Text>
              <Text variant="bodyMedium" selectable>
                Pedido: {provisioning.pedidoId}
              </Text>
            </List.Accordion>
            <ActionButton
              disabled={busy}
              onPress={() => {
                setSelection({id: provisioning.id});
              }}>
              Atualizar vínculo
            </ActionButton>
            <ActionButton disabled={busy} onPress={() => setScanning(true)}>
              Consultar outra etiqueta
            </ActionButton>
          </>
        )}
        {!!message && (
          <Text variant="bodyMedium" accessibilityRole="alert">
            {message}
          </Text>
        )}
        {!busy && !context && !!selection && (
          <ActionButton
            mode="outlined"
            onPress={() => setSelection(value => (value ? {...value} : value))}>
            Tentar consulta novamente
          </ActionButton>
        )}
        {!context && !busy && (
          <Text variant="bodyMedium">
            Leia a etiqueta ou abra Gerenciar este vínculo nos detalhes do
            histórico. O encerramento será confirmado por você antes de enviar à
            API.
          </Text>
        )}
      </VStack>
    </Tela>
  );
}
