import {useAdministrationFlow} from './use-administration-flow';
import {stageLabel, administrationStatusLabel} from './labels';
export {stageLabel} from './labels';
import React from 'react';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ActivityIndicator, Dialog, Portal, Text} from 'react-native-paper';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import OrderSelect from '../../../components/Nfc/OrderSelect';
import BlockingFailure, {
  describeFailure,
} from '../../../components/Nfc/BlockingFailure';
import {
  ActionButton,
  Details,
  FlowSteps,
  StatusPanel,
} from '../../../components/Tracking';

import {
  Confirmation,
  Choice,
  SetupSummary,
  SetupState,
  SetupHeading,
  OutcomeRow,
  RecoverySlots,
} from '../../../components/Nfc/SetupControls';

export default function Administracao() {
  const params =
    useRoute<RouteProp<RotasProvisionar, 'Administracao'>>().params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const {
    order,
    uid,
    setupStep,
    strategy,
    policy,
    link,
    operation,
    materials,
    confirmed,
    activationConfirmed,
    pendingActivation,
    progress,
    journal,
    activity,
    endDialogOpen,
    message,
    failureOpen,
    blockingOperation,
    lookupError,
    canManage,
    physicalNfcAvailable,
    busy,
    run,
    identify,
    prepare,
    refresh,
    execute,
    activate,
    end,
    resolvePending,
    dispatch,
    cancel,
  } = useAdministrationFlow(params?.provisioningId);
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
  const closed = operation?.status === 'ENCERRADA';
  const unknown = materials.filter(value => value === null).length;
  const showConfigure = !!operation && !verified && !closed;
  const tagInUse = describeFailure(message).code === 'NFC_ETIQUETA_EM_USO';
  const manage = () =>
    navigation.navigate(
      'Gerenciar',
      link ? {provisioningId: link.id} : undefined,
    );
  const blocked =
    operation && !['PREPARADA', 'INTERROMPIDA'].includes(operation.status)
      ? 'Atualize o plano para consultar a sessão em andamento.'
      : materials.length !== 5
      ? 'Atualize o plano para carregar as cinco chaves.'
      : unknown
      ? unknown === 1
        ? 'Escolha Atual ou Alvo na chave pendente.'
        : 'Escolha Atual ou Alvo nas ' + unknown + ' chaves pendentes.'
      : !confirmed
      ? 'Marque a confirmação acima para continuar.'
      : '';
  const footer =
    !canManage || !physicalNfcAvailable ? undefined : busy ? (
      <VStack gap={8}>
        <ActivityIndicator />
        <Text accessibilityLiveRegion="polite">
          {busy}.{' '}
          {activity?.nfc
            ? 'Mantenha a etiqueta próxima até a conclusão da sessão NFC.'
            : 'Aguarde o resultado na tela.'}
        </Text>
        {activity?.nfc && (
          <ActionButton
            mode="outlined"
            onPress={() => {
              void cancel();
            }}>
            Cancelar leitura
          </ActionButton>
        )}
      </VStack>
    ) : tagInUse ? (
      <ActionButton
        mode="contained"
        buttonColor="#B42318"
        icon="alert-circle-outline"
        disabled={!enabled}
        onPress={() => dispatch({type: 'failure-visibility', open: true})}>
        Resolver pendência
      </ActionButton>
    ) : active ? (
      <ActionButton
        mode="contained"
        icon="check-circle-outline"
        onPress={manage}>
        Ver vínculo
      </ActionButton>
    ) : verified ? (
      <VStack gap={8}>
        <Confirmation
          label="Quero ativar o rastreio deste pedido"
          checked={activationConfirmed}
          onPress={() =>
            dispatch({
              type: 'activation-confirmed',
              confirmed: !activationConfirmed,
            })
          }
        />
        <ActionButton
          mode="contained"
          icon={pendingActivation ? 'cloud-upload-outline' : 'nfc-tap'}
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
          {pendingActivation ? 'Reenviar ativação' : 'Ler e ativar'}
        </ActionButton>
      </VStack>
    ) : showConfigure ? (
      <VStack gap={8}>
        <Confirmation
          label={
            recovery
              ? 'Conferi as chaves e autorizo retomar'
              : 'Autorizo gravar e proteger esta etiqueta'
          }
          checked={confirmed}
          onPress={() =>
            dispatch({type: 'configuration-confirmed', confirmed: !confirmed})
          }
        />
        {!!blocked && (
          <Text variant="bodySmall" accessibilityLiveRegion="polite">
            {blocked}
          </Text>
        )}
        <ActionButton
          mode="contained"
          icon="nfc-tap"
          disabled={!canExecute}
          onPress={() => {
            void run('Configurando a etiqueta', execute, true);
          }}>
          {recovery ? 'Recuperar configuração' : 'Configurar etiqueta'}
        </ActionButton>
      </VStack>
    ) : closed ? (
      <ActionButton mode="contained" icon="tag-outline" onPress={manage}>
        Gerenciar vínculo
      </ActionButton>
    ) : link ? (
      <ActionButton
        mode="contained"
        icon="refresh"
        disabled={!enabled}
        onPress={() => {
          void run('Preparando o plano', prepare);
        }}>
        Consultar plano
      </ActionButton>
    ) : (
      <VStack gap={4}>
        {setupStep === 0 ? (
          <ActionButton
            mode="contained"
            icon="arrow-right"
            disabled={!enabled || !order}
            onPress={() => dispatch({type: 'step-changed', step: 1})}>
            Continuar
          </ActionButton>
        ) : setupStep === 1 ? (
          <ActionButton
            mode="contained"
            icon={uid ? 'arrow-right' : 'nfc-tap'}
            disabled={!enabled}
            onPress={() => {
              if (uid) dispatch({type: 'step-changed', step: 2});
              else void run('Identificando a etiqueta', identify, true);
            }}>
            {uid ? 'Continuar' : 'Identificar NTAG 424 DNA'}
          </ActionButton>
        ) : (
          <>
            <Text variant="bodySmall">
              {strategy
                ? 'O plano será salvo. A gravação exige outra confirmação.'
                : 'Escolha uma identificação para continuar.'}
            </Text>
            <ActionButton
              mode="contained"
              icon="arrow-right"
              disabled={!enabled || !order || !uid || !strategy}
              onPress={() => {
                void run('Preparando o plano', prepare);
              }}>
              Preparar plano
            </ActionButton>
          </>
        )}
      </VStack>
    );
  if (!order && !params?.provisioningId && canManage && physicalNfcAvailable)
    return (
      <OrderSelect
        insetTop={false}
        pickerFooter={footer}
        disabled={!!busy}
        onSelect={selectedOrder =>
          dispatch({type: 'order-selected', order: selectedOrder})
        }
      />
    );
  return (
    <Tela scroll insetTop={false} footer={footer}>
      <VStack gap={16}>
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
            {!recovery && !message && (
              <FlowSteps
                labels={
                  operation
                    ? ['Preparar', 'Configurar', 'Ativar']
                    : ['Pedido', 'Etiqueta', 'Identificação']
                }
                current={
                  operation ? (active ? 3 : verified ? 3 : 2) : setupStep + 1
                }
              />
            )}
            {!!message && (
              <BlockingFailure
                message={message}
                visible={failureOpen}
                onShow={() =>
                  dispatch({type: 'failure-visibility', open: true})
                }
                onDismiss={() => {
                  if (!busy)
                    dispatch({type: 'failure-visibility', open: false});
                }}
                loading={!!busy}
                actionLabel={
                  tagInUse
                    ? blockingOperation
                      ? blockingOperation.alteracaoEmitida
                        ? 'Abrir configuração anterior'
                        : 'Encerrar e continuar'
                      : 'Consultar pendência'
                    : undefined
                }
                onAction={
                  tagInUse
                    ? () => {
                        void run(
                          'Resolvendo a configuração anterior',
                          resolvePending,
                        );
                      }
                    : undefined
                }>
                {tagInUse && (
                  <>
                    {busy ? (
                      <Text>Consultando a configuração anterior…</Text>
                    ) : blockingOperation ? (
                      <>
                        <Text variant="titleMedium">
                          Época {blockingOperation.plano.epoca} ·{' '}
                          {blockingOperation.plano.uid}
                        </Text>
                        <Text>
                          {blockingOperation.alteracaoEmitida
                            ? 'A configuração já enviou alterações à etiqueta. Abra o plano original para verificar a recuperação necessária.'
                            : 'Nenhuma alteração física foi emitida. Confirmar encerra este plano e prepara o atual. A etiqueta só será gravada com sua autorização.'}
                        </Text>
                      </>
                    ) : (
                      <Text>
                        {lookupError ||
                          'Consulte a configuração anterior para conferir como resolver.'}
                      </Text>
                    )}
                  </>
                )}
              </BlockingFailure>
            )}
            {operation || link ? (
              <SetupSummary
                compact
                order={order?.codigo ?? 'Pedido associado'}
                uid={uid}
                detail={
                  'Época ' +
                  (link?.epoca ?? '—') +
                  ' · ' +
                  (link?.estrategia ?? operation!.plano.estrategia)
                }
              />
            ) : (
              <>
                {setupStep === 0 && (
                  <>
                    <SetupHeading
                      title="Qual pedido?"
                      description="Selecione o volume que receberá a etiqueta."
                    />
                    <OrderSelect
                      selected={order}
                      disabled={!!busy}
                      onSelect={selectedOrder =>
                        dispatch({type: 'order-selected', order: selectedOrder})
                      }
                    />
                  </>
                )}
                {setupStep === 1 && (
                  <>
                    <SetupState
                      icon={uid ? 'check-circle-outline' : 'nfc-tap'}
                      title={
                        uid ? 'Etiqueta identificada' : 'Aproxime a NTAG 424'
                      }
                      description={
                        uid
                          ? 'Número preenchido pela leitura. Nenhuma configuração foi alterada.'
                          : 'Encoste a etiqueta na parte superior do iPhone.'
                      }
                      tone={uid ? 'success' : 'info'}
                    />
                    <SetupSummary
                      order={order?.codigo ?? 'Pedido'}
                      uid={uid}
                      detail="NTAG 424 DNA"
                    />
                    {!!uid && (
                      <ActionButton
                        mode="outlined"
                        disabled={!enabled}
                        onPress={() => {
                          void run('Identificando a etiqueta', identify, true);
                        }}>
                        Ler outra etiqueta
                      </ActionButton>
                    )}
                  </>
                )}
                {setupStep === 2 && (
                  <>
                    <SetupHeading
                      title="Como identificar?"
                      description="O tratamento ficará fixo neste vínculo."
                    />
                    <Choice
                      title="Leitura autenticada · SDM"
                      description="Valida a autenticidade e o contador no servidor."
                      icon="shield-check-outline"
                      selected={strategy === 'SDM'}
                      disabled={!!busy}
                      onPress={() =>
                        dispatch({type: 'strategy-selected', strategy: 'SDM'})
                      }
                    />
                    <Choice
                      title="Número da etiqueta · UID"
                      description="Identifica pelo número físico da etiqueta."
                      icon="fingerprint"
                      selected={strategy === 'UID'}
                      disabled={!!busy}
                      onPress={() =>
                        dispatch({type: 'strategy-selected', strategy: 'UID'})
                      }
                    />
                    <Choice
                      title="Referência gravada · NDEF"
                      description="Identifica pela referência salva na memória."
                      icon="link-variant"
                      selected={strategy === 'NDEF_ESTATICO'}
                      disabled={!!busy}
                      onPress={() =>
                        dispatch({
                          type: 'strategy-selected',
                          strategy: 'NDEF_ESTATICO',
                        })
                      }
                    />
                    {strategy === 'SDM' && (
                      <Details title="Política de leituras · regras do contador">
                        <VStack gap={8}>
                          <Choice
                            title="Estrita"
                            description="Aceita apenas contadores crescentes."
                            icon="shield-lock-outline"
                            selected={policy === 'ESTRITA'}
                            disabled={!!busy}
                            onPress={() =>
                              dispatch({
                                type: 'policy-selected',
                                policy: 'ESTRITA',
                              })
                            }
                          />
                          <Choice
                            title="Registro tardio"
                            description="Preserva também leituras anteriores inéditas."
                            icon="history"
                            selected={policy === 'REGISTRO_TARDIO'}
                            disabled={!!busy}
                            onPress={() =>
                              dispatch({
                                type: 'policy-selected',
                                policy: 'REGISTRO_TARDIO',
                              })
                            }
                          />
                        </VStack>
                      </Details>
                    )}
                    {strategy === 'SDM' && (
                      <Text variant="bodySmall">
                        Política:{' '}
                        {policy === 'ESTRITA'
                          ? 'Estrita · contador crescente'
                          : 'Registro tardio'}
                      </Text>
                    )}
                  </>
                )}
                {setupStep > 0 && (
                  <ActionButton
                    disabled={!!busy}
                    onPress={() =>
                      dispatch({type: 'step-changed', step: setupStep - 1})
                    }>
                    Etapa anterior
                  </ActionButton>
                )}
              </>
            )}
            {operation && (
              <>
                {closed && verified && (
                  <Text variant="bodySmall">
                    Operação encerrada · configuração preservada
                  </Text>
                )}
                <SetupState
                  compact={!active}
                  icon={
                    active
                      ? 'check-decagram-outline'
                      : verified
                      ? 'shield-check-outline'
                      : closed
                      ? 'archive-outline'
                      : recovery
                      ? 'restart-alert'
                      : 'nfc-tap'
                  }
                  title={
                    busy
                      ? progress && activity?.nfc
                        ? stageLabel(progress.stage)
                        : busy
                      : active
                      ? 'Vínculo ativo'
                      : verified
                      ? 'Configuração conferida'
                      : administrationStatusLabel(operation)
                  }
                  tone={
                    busy
                      ? 'info'
                      : active || verified
                      ? 'success'
                      : recovery
                      ? 'warning'
                      : 'info'
                  }
                  description={
                    busy
                      ? activity?.nfc
                        ? 'Mantenha a etiqueta imóvel junto ao iPhone.'
                        : 'Consultando o servidor. Nenhuma leitura NFC é necessária.'
                      : active
                      ? 'Pronto para registrar coleta e acompanhar o pedido.'
                      : verified
                      ? pendingActivation
                        ? 'A mesma evidência de leitura está salva. Basta reenviar a ativação.'
                        : 'Falta ativar o vínculo. Afaste a etiqueta e faça uma nova leitura.'
                      : closed
                      ? 'Plano encerrado sem configurar. Libere o vínculo para criar uma nova época.'
                      : recovery
                      ? 'O plano está salvo. Confira as chaves antes de retomar.'
                      : 'Confira o pedido. A gravação começa somente com sua autorização.'
                  }
                />
                {showConfigure && (
                  <>
                    {recovery ? (
                      <RecoverySlots
                        materials={materials}
                        disabled={!!busy}
                        onChange={(index, value) =>
                          dispatch({
                            type: 'material-selected',
                            index,
                            material: value,
                          })
                        }
                      />
                    ) : (
                      <VStack gap={0}>
                        <OutcomeRow
                          icon="link-variant"
                          text="Grava a identificação deste pedido"
                        />
                        <OutcomeRow
                          icon="lock-outline"
                          text="Protege a escrita pública"
                        />
                        <OutcomeRow
                          icon="key-outline"
                          text="Atualiza e confere as cinco chaves"
                        />
                      </VStack>
                    )}
                    <Text variant="bodySmall">
                      {recovery
                        ? 'As seleções vêm do diário salvo. Resultados desconhecidos exigem sua escolha; nenhuma chave alternativa será testada.'
                        : 'O conteúdo NDEF atual será substituído. Mantenha rede estável durante a configuração.'}
                    </Text>
                  </>
                )}
                {verified && !active && (
                  <OutcomeRow
                    icon={
                      pendingActivation ? 'cloud-upload-outline' : 'nfc-tap'
                    }
                    text={
                      pendingActivation
                        ? 'Reenvio pela internet · sem nova sessão NFC'
                        : 'Nova leitura NFC · sem repetir a configuração'
                    }
                  />
                )}
                {!!progress && (
                  <Text accessibilityLiveRegion="polite">
                    {stageLabel(progress.stage)} · comando {progress.sequence}
                  </Text>
                )}
                <ActionButton
                  mode="outlined"
                  icon="refresh"
                  disabled={!enabled}
                  onPress={() => {
                    void run('Atualizando e recuperando o diário', refresh);
                  }}>
                  Atualizar plano
                </ActionButton>
                <Details title="Detalhes técnicos">
                  <VStack gap={12}>
                    <Details title="Versões das chaves">
                      <Text>
                        Versões atuais:{' '}
                        {operation.plano.versoesChaves.join(' · ')}
                        {'\n'}Versões do alvo:{' '}
                        {operation.plano.personalizacao.versoesAlvo.join(' · ')}
                      </Text>
                    </Details>
                    <Details title={'Diário de comandos · ' + journal.length}>
                      <Text>
                        Tentativa: envio iniciado · Resposta salva: evidência
                        local · Recibo API: resposta processada.
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
                          {entry.code ? ' · ' + entry.code : ''}
                        </Text>
                      ))}
                    </Details>
                    <Text selectable>
                      Operação: {operation.id}
                      {'\n'}Alvo:{' '}
                      {operation.plano.personalizacao.referenciaAlvo}
                      {'\n'}Hash: {operation.hashPlano}
                    </Text>
                  </VStack>
                </Details>
                {!closed && (!operation.alteracaoEmitida || verified) && (
                  <ActionButton
                    disabled={!enabled}
                    onPress={() =>
                      dispatch({type: 'dialog-visibility', open: true})
                    }>
                    {verified ? 'Finalizar configuração' : 'Encerrar plano'}
                  </ActionButton>
                )}
                {!active && !closed && (
                  <ActionButton disabled={!!busy} onPress={manage}>
                    Gerenciar vínculo
                  </ActionButton>
                )}
              </>
            )}
          </>
        )}
        {endDialogOpen && operation && (
          <Portal>
            <Dialog
              visible
              onDismiss={() =>
                dispatch({type: 'dialog-visibility', open: false})
              }>
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
                <ActionButton
                  onPress={() =>
                    dispatch({type: 'dialog-visibility', open: false})
                  }>
                  Voltar ao plano
                </ActionButton>
                <ActionButton
                  mode="contained"
                  onPress={() => {
                    dispatch({type: 'dialog-visibility', open: false});
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
