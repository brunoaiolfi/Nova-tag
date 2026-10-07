import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Checkbox,
  Dialog,
  List,
  Portal,
  RadioButton,
  Text,
} from 'react-native-paper';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import type {
  OrderSummary,
  Provisioning,
  Strategy,
} from '../../../appplication/traceability/workflow';
import type {
  AdminOperation,
  Material,
} from '../../../domain/administration/types';
import type {AdministrationProgress} from '../../../appplication/administration/coordinator';
import {administration} from '../../../infra/administration/runtime';
import {identifyAdministrativeTag} from '../../../infra/nfc/administration';
import {physicalNfcAvailable} from '../../../infra/nfc/reader';
import {traceability} from '../../../infra/traceability/runtime';
import {useSession} from '../../../components/Auth/SessionProvider';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import OrderSelect from '../../../components/Nfc/OrderSelect';
import {
  ActionButton,
  PageHero,
  StatusPanel,
} from '../../../components/Tracking';

export function stageLabel(stage: string): string {
  if (
    stage.includes('AUTH') ||
    stage.includes('AUTENTICAR') ||
    stage.includes('DESAFIO') ||
    stage.includes('CONFIRMAR_AUTH')
  )
    return 'Autenticando a etiqueta';
  if (stage.includes('TROCAR_CHAVE'))
    return `Atualizando a chave ${stage.at(-1)}`;
  if (stage.startsWith('GRAVAR_NDEF'))
    return 'Gravando a identificação do pedido';
  if (stage === 'GRAVAR_CC') return 'Protegendo a escrita pública';
  if (stage.includes('CONFIG')) return 'Conferindo as permissões dos arquivos';
  if (stage.includes('CONFERIR')) return 'Conferindo os dados gravados';
  if (stage.includes('UID')) return 'Conferindo a identidade autenticada';
  if (stage.includes('VERSAO')) return 'Conferindo as versões das chaves';
  return 'Conferindo a configuração da etiqueta';
}
const treatment = (s: Strategy) =>
  s === 'UID'
    ? 'Número da etiqueta (UID)'
    : s === 'SDM'
    ? 'Leitura autenticada (SDM)'
    : 'Referência gravada (NDEF estático)';
const status = (op: AdminOperation) =>
  op.status === 'ENCERRADA'
    ? 'Operação encerrada'
    : op.alteracaoFisica === 'CONFERIDA'
    ? 'Configuração conferida'
    : op.status === 'INTERROMPIDA'
    ? 'Configuração interrompida'
    : op.status === 'PERSONALIZANDO'
    ? 'Sessão NFC em andamento'
    : 'Plano pronto para configurar';

export default function Administracao() {
  const params =
    useRoute<RouteProp<RotasProvisionar, 'Administracao'>>().params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const {state} = useSession();
  const canManage =
    state.status === 'authenticated' &&
    state.session.user.perfil === 'ADMINISTRADOR';
  const scope = state.session
    ? [state.session.baseUrl, state.session.user.id, state.session.token].join(
        '\u0000',
      )
    : state.status;
  const scopeRef = useRef(scope);
  const [order, setOrder] = useState<OrderSummary>();
  const [uid, setUid] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('UID');
  const [policy, setPolicy] = useState<'ESTRITA' | 'REGISTRO_TARDIO'>(
    'ESTRITA',
  );
  const [link, setLink] = useState<Provisioning>();
  const [operation, setOperation] = useState<AdminOperation>();
  const [materials, setMaterials] = useState<(Material | null)[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [activationConfirmed, setActivationConfirmed] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(false);
  const [progress, setProgress] = useState<AdministrationProgress>();
  const [journal, setJournal] = useState<
    Awaited<ReturnType<typeof administration.localJournal>>
  >([]);
  const [activity, setActivity] = useState<{
    label: string;
    nfc: boolean;
  } | null>(null);
  const busy = activity?.label ?? '';
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0),
    working = useRef(false);
  const requestedPlan = useRef('');
  const opRef = useRef(operation);
  opRef.current = operation;

  const install = useCallback(async (op: AdminOperation, token: number) => {
    const choices = await administration.suggestions(op),
      entries = await administration.localJournal(op),
      pending = await administration.activationPending(op);
    if (token === generation.current) {
      setOperation(op);
      setMaterials(choices);
      setJournal(entries);
      setPendingActivation(pending);
      setConfirmed(false);
    }
  }, []);
  const run = useCallback(
    async (
      label: string,
      job: (token: number) => Promise<void>,
      nfc = false,
    ) => {
      if (
        working.current ||
        !canManage ||
        !physicalNfcAvailable ||
        scopeRef.current !== scope
      )
        return;
      const token = generation.current;
      working.current = true;
      setActivity({label, nfc});
      setMessage('');
      try {
        await job(token);
      } catch (e) {
        if (token === generation.current) {
          setMessage(
            e instanceof Error
              ? e.message
              : 'Operação não confirmada. Atualize a operação para recuperar.',
          );
          const current = opRef.current;
          if (current)
            try {
              await install(await administration.refresh(current.id), token);
            } catch {
              /* Preserve the last visible checkpoint while offline. */
            }
        }
      } finally {
        working.current = false;
        setActivity(null);
      }
    },
    [canManage, install, scope],
  );

  useFocusEffect(
    useCallback(() => {
      if (!canManage) void administration.cancel().catch(() => {});
      generation.current++;
      if (scopeRef.current !== scope) {
        scopeRef.current = scope;
        setOrder(undefined);
        setUid('');
        setLink(undefined);
        setOperation(undefined);
        setMaterials([]);
        setConfirmed(false);
        setActivationConfirmed(false);
        setPendingActivation(false);
        setProgress(undefined);
        setJournal([]);
        setMessage('');
        setEndDialogOpen(false);
      }
      setActivity(
        working.current
          ? {
              label: 'Aguardando o encerramento da operação anterior',
              nfc: false,
            }
          : null,
      );
      return () => {
        generation.current++;
        void administration.cancel().catch(() => {});
      };
    }, [canManage, scope]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => {
      // iOS NFC sheets report inactive. Only background ends the RF session.
      if (value === 'background') void administration.cancel().catch(() => {});
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!params?.provisioningId || !canManage || !physicalNfcAvailable) return;
    const requestKey = scope + '\u0000' + params.provisioningId;
    if (working.current || requestedPlan.current === requestKey) return;
    requestedPlan.current = requestKey;
    void run('Consultando o plano', async token => {
      const p = await traceability.provisioning(params.provisioningId!);
      const o = await traceability.order(p.pedidoId);
      if (token !== generation.current) return;
      setLink(p);
      setOrder(o);
      setUid(p.uid);
      setStrategy(p.estrategia);
      await install(await administration.prepare(p), token);
    });
  }, [params?.provisioningId, canManage, run, install, scope, busy]);

  async function identify(token: number) {
    const tag = await identifyAdministrativeTag();
    if (token === generation.current) {
      setUid(tag.uid);
      setMessage(
        'NTAG 424 DNA identificada. Nenhuma configuração foi alterada.',
      );
    }
  }
  async function prepare(token: number) {
    if (!order || !uid) return;
    const p =
      link ?? (await administration.register(order.id, uid, strategy, policy));
    if (token !== generation.current) return;
    setLink(p);
    await install(await administration.prepare(p), token);
  }
  async function refresh(token: number) {
    if (!operation) return;
    const op = await administration.restore(
      await administration.refresh(operation.id),
    );
    await install(op, token);
    if (link) {
      const p = await traceability.provisioning(link.id);
      if (token === generation.current) setLink(p);
    }
  }
  async function execute(token: number) {
    if (
      !operation ||
      !confirmed ||
      materials.length !== 5 ||
      materials.some(x => x === null)
    )
      return;
    const op = await administration.execute(
      operation,
      materials as Material[],
      p => {
        if (token === generation.current) setProgress(p);
      },
    );
    await install(op, token);
    if (token === generation.current)
      setMessage(
        'Configuração conferida pela API. Afaste a etiqueta antes da leitura de ativação.',
      );
  }
  async function activate(token: number) {
    if (!operation || !link || !activationConfirmed) return;
    const p = await administration.activate(operation, link, true);
    if (token === generation.current) {
      setLink(p);
      setPendingActivation(false);
      setMessage(
        'Vínculo ativo. A etiqueta está pronta para registrar coleta e acompanhar o pedido.',
      );
    }
  }
  async function end(token: number) {
    if (!operation) return;
    const wasVerified = operation.alteracaoFisica === 'CONFERIDA';
    await install(await administration.end(operation), token);
    if (token === generation.current)
      setMessage(
        wasVerified
          ? 'Operação administrativa encerrada. A configuração conferida e o vínculo foram preservados.'
          : 'Plano encerrado sem configurar a etiqueta. Em Gerenciar, encerre o vínculo registrado e crie uma nova época quando quiser configurar.',
      );
  }
  const recovery = operation?.status === 'INTERROMPIDA';
  const verified = operation?.alteracaoFisica === 'CONFERIDA';
  const enabled = canManage && physicalNfcAvailable && !busy;
  const canExecute =
    enabled &&
    confirmed &&
    materials.length === 5 &&
    materials.every(Boolean) &&
    !!operation &&
    ['PREPARADA', 'INTERROMPIDA'].includes(operation.status);
  const active = link?.status === 'ATIVA';
  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          compact
          icon="shield-check-outline"
          eyebrow="CONFIGURAÇÃO ADMINISTRATIVA"
          title={
            active
              ? 'Etiqueta pronta para rastrear.'
              : 'Configure a NTAG 424 DNA.'
          }
          description="Pedido → plano → configuração → ativação. As chaves permanecem no cofre da API."
        />
      }
      footer={
        busy ? (
          <VStack gap={8}>
            <Text>
              {busy}.{' '}
              {activity?.nfc
                ? 'Mantenha a etiqueta próxima até a conclusão da sessão NFC.'
                : 'Aguarde o resultado na tela. O diário será preservado.'}
            </Text>
            {activity?.nfc && (
              <ActionButton
                mode="outlined"
                onPress={() => {
                  void administration.cancel().catch(() => {});
                }}>
                Cancelar sessão NFC
              </ActionButton>
            )}
          </VStack>
        ) : verified && !active ? (
          <ActionButton
            mode="contained"
            disabled={!enabled || !activationConfirmed}
            onPress={() => {
              void run(
                pendingActivation
                  ? 'Confirmando leitura salva'
                  : 'Lendo em nova sessão para ativar',
                activate,
                !pendingActivation,
              );
            }}>
            {pendingActivation
              ? 'Reenviar leitura de ativação'
              : 'Ler novamente e ativar'}
          </ActionButton>
        ) : operation && !verified && operation.status !== 'ENCERRADA' ? (
          <ActionButton
            mode="contained"
            disabled={!canExecute}
            onPress={() => {
              void run('Configurando a etiqueta', execute, true);
            }}>
            {recovery
              ? 'Recuperar com nova sessão NFC'
              : 'Aproximar e configurar'}
          </ActionButton>
        ) : !operation ? (
          <ActionButton
            mode="contained"
            disabled={!enabled || !order || !uid}
            onPress={() => {
              void run('Preparando o plano', prepare);
            }}>
            Preparar plano de configuração
          </ActionButton>
        ) : undefined
      }>
      <VStack gap={24}>
        {!canManage ? (
          <StatusPanel tone="warning">
            <Text>
              Entre como Administrador e conecte-se à API para configurar ou
              recuperar uma etiqueta.
            </Text>
          </StatusPanel>
        ) : !physicalNfcAvailable ? (
          <StatusPanel tone="warning">
            <Text>
              Use o app de desenvolvimento instalado no iPhone ou Android. O
              Expo Go e o navegador não oferecem o transporte NFC necessário.
            </Text>
          </StatusPanel>
        ) : (
          <>
            <VStack gap={8}>
              <Text variant="labelLarge">1 · PEDIDO E ETIQUETA</Text>
              {operation || link ? (
                <>
                  <Text variant="headlineSmall">
                    {order?.codigo ?? 'Pedido associado'}
                  </Text>
                  <Text>{order?.descricao}</Text>
                  <Text selectable>NTAG 424 DNA · {uid}</Text>
                  <Text>
                    Época {link?.epoca} ·{' '}
                    {treatment(link?.estrategia ?? strategy)}
                  </Text>
                </>
              ) : (
                <>
                  <OrderSelect
                    selected={order}
                    disabled={!!busy}
                    onSelect={setOrder}
                  />
                  <Text>
                    {uid
                      ? `NTAG 424 DNA · ${uid}`
                      : 'O modelo e o número serão preenchidos pela leitura.'}
                  </Text>
                  <ActionButton
                    mode="outlined"
                    icon="nfc-search-variant"
                    disabled={!enabled}
                    onPress={() => {
                      void run('Identificando a etiqueta', identify, true);
                    }}>
                    {uid
                      ? 'Ler outra NTAG 424 DNA'
                      : 'Identificar NTAG 424 DNA'}
                  </ActionButton>
                  <Text variant="titleMedium">Tratamento do ensaio</Text>
                  <RadioButton.Group
                    value={strategy}
                    onValueChange={s => setStrategy(s as Strategy)}>
                    {(['UID', 'NDEF_ESTATICO', 'SDM'] as Strategy[]).map(s => (
                      <RadioButton.Item
                        key={s}
                        label={treatment(s)}
                        value={s}
                        disabled={!!busy}
                        position="leading"
                      />
                    ))}
                  </RadioButton.Group>
                  {strategy === 'SDM' && (
                    <>
                      <Text variant="titleMedium">
                        Política para leituras fora de ordem
                      </Text>
                      <RadioButton.Group
                        value={policy}
                        onValueChange={p => setPolicy(p as typeof policy)}>
                        <RadioButton.Item
                          label="Estrita · exige contador crescente"
                          value="ESTRITA"
                          disabled={!!busy}
                        />
                        <RadioButton.Item
                          label="Registro tardio · preserva leituras anteriores inéditas"
                          value="REGISTRO_TARDIO"
                          disabled={!!busy}
                        />
                      </RadioButton.Group>
                    </>
                  )}
                  <Text>
                    Para sua etiqueta Feiju, use o vínculo simples na tela
                    anterior. Este fluxo exige NTAG 424 DNA e inventário de
                    credenciais importado pelo administrador na API.
                  </Text>
                </>
              )}
            </VStack>
            {operation && (
              <>
                <VStack gap={8}>
                  <Text variant="labelLarge">2 · PLANO DE CONFIGURAÇÃO</Text>
                  <StatusPanel tone={verified ? 'success' : 'warning'}>
                    <Text variant="titleMedium">{status(operation)}</Text>
                    <Text>
                      {operation.status === 'ENCERRADA' && !verified
                        ? 'O plano foi encerrado sem configuração. Em Gerenciar, encerre este vínculo registrado e crie uma nova época para configurar a etiqueta.'
                        : verified
                        ? 'Os dados, as permissões e os cinco slots foram conferidos pela API.'
                        : operation.alteracaoEmitida
                        ? 'Uma alteração já foi transmitida. Preserve o plano original e recupere antes de reutilizar a etiqueta.'
                        : 'O plano está salvo. A configuração só começa ao aproximar e confirmar abaixo.'}
                    </Text>
                  </StatusPanel>
                  <Text>
                    A configuração substitui o NDEF, protege a escrita pública e
                    atualiza as chaves dos slots 0 a 4. O tratamento será{' '}
                    {treatment(operation.plano.estrategia)}.
                  </Text>
                  <Text>
                    Versões atuais: {operation.plano.versoesChaves.join(' · ')}
                    {'\n'}Versões do alvo:{' '}
                    {operation.plano.personalizacao.versoesAlvo.join(' · ')}
                  </Text>
                  <Text>
                    Use rede estável e mantenha a etiqueta imóvel junto à
                    antena. Se a sessão parar, afaste a etiqueta e atualize o
                    plano antes de recuperar.
                  </Text>
                  {recovery && (
                    <VStack gap={8}>
                      <Text variant="titleMedium">
                        Recuperação · confirme os cinco slots
                      </Text>
                      <Text>
                        Atual = credencial anterior ao plano. Alvo = credencial
                        definida neste plano. As sugestões vêm do diário local;
                        uma tentativa sem recibo exige escolha explícita. A API
                        não testa uma chave alternativa após falha.
                      </Text>
                      {materials.map((choice, i) => (
                        <VStack key={i} gap={4}>
                          <Text variant="titleMedium">
                            Slot {i}
                            {choice === null
                              ? ' · resultado da troca desconhecido'
                              : ''}
                          </Text>
                          <RadioButton.Group
                            value={choice ?? ''}
                            onValueChange={value =>
                              setMaterials(old =>
                                old.map((x, j) =>
                                  j === i ? (value as Material) : x,
                                ),
                              )
                            }>
                            <RadioButton.Item
                              value="ATUAL"
                              label={`Slot ${i}: Atual`}
                              disabled={!!busy}
                            />
                            <RadioButton.Item
                              value="ALVO"
                              label={`Slot ${i}: Alvo`}
                              disabled={!!busy}
                            />
                          </RadioButton.Group>
                        </VStack>
                      ))}
                    </VStack>
                  )}
                  {!verified && operation.status !== 'ENCERRADA' && (
                    <Checkbox.Item
                      label={
                        recovery
                          ? 'Conferi o plano e o material selecionado em cada slot'
                          : 'Conferi o pedido e autorizo esta configuração física'
                      }
                      status={confirmed ? 'checked' : 'unchecked'}
                      disabled={!!busy}
                      onPress={() => setConfirmed(x => !x)}
                    />
                  )}
                </VStack>
                <VStack gap={8}>
                  <Text variant="labelLarge">
                    3 · CONFIGURAÇÃO E CONFERÊNCIA
                  </Text>
                  {busy && <ActivityIndicator accessibilityLabel={busy} />}
                  <Text accessibilityLiveRegion="polite">
                    {progress
                      ? `${stageLabel(progress.stage)} · comando ${
                          progress.sequence
                        }`
                      : verified
                      ? 'Conferência concluída.'
                      : 'O progresso aparecerá aqui e permanecerá visível se houver uma falha.'}
                  </Text>
                  <ActionButton
                    mode="outlined"
                    disabled={!enabled}
                    onPress={() => {
                      void run('Atualizando e recuperando o diário', refresh);
                    }}>
                    Atualizar operação e diário
                  </ActionButton>
                  <List.Accordion
                    title={`Diário de comandos · ${journal.length}`}>
                    <Text>
                      Tentativa = envio NFC iniciado. Resposta salva = evidência
                      local. Recibo API = resposta processada pelo servidor.
                    </Text>
                    {journal.map((entry, i) => (
                      <Text key={i}>
                        #{entry.sequence} · {stageLabel(entry.stage)} ·{' '}
                        {entry.state === 'ACKNOWLEDGED'
                          ? 'Recibo API'
                          : entry.state === 'RESPONSE'
                          ? 'Resposta salva'
                          : entry.state === 'ATTEMPTED'
                          ? 'Tentativa'
                          : 'Aguardando envio'}
                        {entry.code ? ` · ${entry.code}` : ''}
                      </Text>
                    ))}
                  </List.Accordion>
                </VStack>
                {verified && (
                  <VStack gap={8}>
                    <Text variant="labelLarge">4 · ATIVAÇÃO DO RASTREIO</Text>
                    <StatusPanel tone={active ? 'success' : 'warning'}>
                      <Text variant="titleMedium">
                        {active ? 'Vínculo ativo' : 'Falta ativar o vínculo'}
                      </Text>
                      <Text>
                        {active
                          ? 'Registre coleta, recebimento e as demais etapas. O histórico estará na aba Rastreio.'
                          : pendingActivation
                          ? 'A leitura da nova sessão está salva. O reenvio usa essa mesma evidência, sem transmitir os comandos de configuração novamente.'
                          : 'Afaste a etiqueta após a configuração. A próxima leitura abrirá uma nova sessão NFC; no SDM a API validará a evidência antes da ativação.'}
                      </Text>
                    </StatusPanel>
                    {!active && (
                      <Checkbox.Item
                        label="Conferi a conclusão e quero ativar este vínculo"
                        status={activationConfirmed ? 'checked' : 'unchecked'}
                        disabled={!!busy}
                        onPress={() => setActivationConfirmed(x => !x)}
                      />
                    )}
                    {active && (
                      <ActionButton
                        mode="outlined"
                        disabled={!enabled}
                        onPress={() =>
                          navigation.navigate('Gerenciar', {
                            provisioningId: link?.id,
                          })
                        }>
                        Ver vínculo da etiqueta
                      </ActionButton>
                    )}
                  </VStack>
                )}
                {operation.status !== 'ENCERRADA' &&
                  (!operation.alteracaoEmitida || verified) && (
                    <ActionButton
                      mode="outlined"
                      disabled={!enabled}
                      onPress={() => {
                        setEndDialogOpen(true);
                      }}>
                      {verified
                        ? 'Finalizar operação administrativa'
                        : 'Encerrar plano sem configurar'}
                    </ActionButton>
                  )}
                <List.Accordion title="Identificadores do plano">
                  <Text selectable>
                    Operação: {operation.id}
                    {'\n'}Alvo: {operation.plano.personalizacao.referenciaAlvo}
                    {'\n'}Hash: {operation.hashPlano}
                  </Text>
                </List.Accordion>
              </>
            )}
            <ActionButton
              disabled={!!busy}
              onPress={() =>
                navigation.navigate(
                  'Gerenciar',
                  link ? {provisioningId: link.id} : undefined,
                )
              }>
              Gerenciar ou retomar um vínculo
            </ActionButton>
          </>
        )}
        {!!message && (
          <StatusPanel tone="warning">
            <Text accessibilityRole="alert" selectable>
              {message}
            </Text>
          </StatusPanel>
        )}
        {endDialogOpen && operation && (
          <Portal>
            <Dialog visible onDismiss={() => setEndDialogOpen(false)}>
              <Dialog.Title>
                {verified
                  ? 'Finalizar a administração?'
                  : 'Encerrar sem configurar?'}
              </Dialog.Title>
              <Dialog.Content>
                <Text>
                  {verified
                    ? active
                      ? 'A configuração e o vínculo ativo serão preservados. Você poderá registrar eventos e consultar o histórico normalmente.'
                      : 'A configuração conferida será preservada, mas o vínculo continuará registrado. Você poderá voltar para fazer a leitura de ativação.'
                    : 'Nenhum comando de configuração foi emitido. O plano será encerrado e o vínculo continuará registrado. Para configurar depois, encerre o vínculo em Gerenciar e crie uma nova época.'}
                </Text>
                <Text>O plano e o diário permanecerão no histórico.</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <ActionButton onPress={() => setEndDialogOpen(false)}>
                  Voltar ao plano
                </ActionButton>
                <ActionButton
                  mode="contained"
                  onPress={() => {
                    setEndDialogOpen(false);
                    void run('Finalizando a operação administrativa', end);
                  }}>
                  Confirmar encerramento
                </ActionButton>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        )}
      </VStack>
    </Tela>
  );
}
