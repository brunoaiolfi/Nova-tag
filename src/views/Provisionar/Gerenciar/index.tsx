import {useProvisioningManagement} from './use-provisioning-management';
import React from 'react';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ActivityIndicator, Text} from 'react-native-paper';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import Leitor from '../../../components/Nfc/Leitor';
import {ActionButton, Details, StatusPanel} from '../../../components/Tracking';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import {stateLabel} from '../../../components/Tracking/labels';

import {
  Confirmation,
  SetupSummary,
  SetupState,
  OutcomeRow,
} from '../../../components/Nfc/SetupControls';

export default function Gerenciar() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const params = useRoute<RouteProp<RotasProvisionar, 'Gerenciar'>>().params;
  const {
    selection,
    context,
    scanning,
    busy,
    confirming,
    confirmed,
    message,
    canManage,
    physicalNfcAvailable,
    close,
    select,
    setScanning,
    requestClosure,
    cancelClosure,
    toggleConfirmation,
    reload,
  } = useProvisioningManagement(params?.provisioningId);
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
          select({reading});
          setScanning(false);
        }}
      />
    );
  }
  const provisioning = context?.provisioning;
  const closed = provisioning?.status === 'DESPROVISIONADA';
  const administrative =
    provisioning?.modelo?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ===
    'NTAG424DNA';
  const pending = provisioning?.status === 'REGISTRADA';
  const resume = () =>
    navigation.push('Administracao', {provisioningId: provisioning!.id});
  const askToClose = requestClosure;
  const newLink = () => {
    if (!provisioning) return;
    if (provisioning.estrategia === 'SDM') navigation.push('Administracao');
    else
      navigation.push('EtapasProvisionamento', {
        estrategia:
          provisioning.estrategia === 'UID'
            ? EnumEstrategiasNFC.UID
            : EnumEstrategiasNFC.NDEF_ESTATICO,
        expectedUid: provisioning.uid,
        registeredModel: provisioning.modelo,
      });
  };
  return (
    <Tela
      scroll
      insetTop={false}
      footer={
        context && closed ? (
          <ActionButton
            mode="contained"
            icon="plus"
            disabled={busy || !canManage}
            onPress={newLink}>
            Novo vínculo
          </ActionButton>
        ) : context && confirming ? (
          <VStack gap={8}>
            <Confirmation
              label="Quero liberar esta etiqueta do pedido"
              checked={confirmed}
              disabled={busy}
              onPress={toggleConfirmation}
            />
            {!confirmed && (
              <Text variant="bodySmall">
                Marque a confirmação para liberar a etiqueta.
              </Text>
            )}
            <ActionButton
              mode="contained"
              buttonColor="#B42318"
              icon="link-variant-off"
              disabled={busy || !canManage || !confirmed}
              loading={busy}
              onPress={() => {
                void close();
              }}>
              Confirmar encerramento
            </ActionButton>
          </VStack>
        ) : context && administrative && pending ? (
          <ActionButton
            mode="contained"
            icon="nfc-tap"
            disabled={busy || !canManage}
            onPress={resume}>
            Retomar configuração
          </ActionButton>
        ) : context ? (
          <ActionButton
            mode="outlined"
            icon="link-variant-off"
            disabled={busy || !canManage}
            onPress={askToClose}>
            Encerrar vínculo
          </ActionButton>
        ) : (
          <ActionButton
            mode="contained"
            icon="nfc-search-variant"
            disabled={busy || !canManage || !physicalNfcAvailable}
            onPress={() => setScanning(true)}>
            Ler etiqueta
          </ActionButton>
        )
      }>
      <VStack gap={20}>
        {!canManage && (
          <Text accessibilityRole="alert">
            Somente um Administrador pode encerrar vínculos.
          </Text>
        )}
        {busy && <ActivityIndicator accessibilityLabel="Consultando vínculo" />}
        {!!message && (
          <StatusPanel tone="warning">
            <Text accessibilityRole="alert">{message}</Text>
          </StatusPanel>
        )}
        {context && provisioning ? (
          <>
            <SetupSummary
              compact
              order={context.order.codigo}
              uid={provisioning.uid}
              detail={
                'Época ' +
                (provisioning.epoca ?? '—') +
                ' · ' +
                (provisioning.estrategia === 'UID'
                  ? 'Identificação por UID'
                  : provisioning.estrategia === 'SDM'
                  ? 'Leitura autenticada · SDM'
                  : 'Referência NDEF estática')
              }
            />
            <SetupState
              compact
              icon={
                confirming
                  ? 'link-variant-off'
                  : closed
                  ? 'tag-check-outline'
                  : pending
                  ? 'nfc-tap'
                  : 'check-circle-outline'
              }
              tone={
                confirming
                  ? 'danger'
                  : closed
                  ? 'info'
                  : pending
                  ? 'warning'
                  : 'success'
              }
              title={
                confirming
                  ? 'Liberar esta etiqueta?'
                  : closed
                  ? 'Vínculo encerrado'
                  : pending
                  ? 'Pendente de ativação'
                  : 'Vínculo ativo'
              }
              description={
                confirming
                  ? 'Este pedido deixará de aceitar novas etapas com esta etiqueta.'
                  : closed
                  ? 'O histórico está preservado. Você pode criar um novo vínculo.'
                  : pending
                  ? 'Conclua a configuração para começar o rastreio.'
                  : 'Pronta para registrar as etapas deste pedido.'
              }
            />
            {confirming ? (
              <>
                <OutcomeRow
                  icon="history"
                  text="Histórico do pedido preservado"
                />
                <OutcomeRow
                  icon="package-variant-closed"
                  text="A entrega não será concluída por esta ação"
                />
                <OutcomeRow
                  icon="nfc-variant"
                  text="O conteúdo físico da etiqueta será mantido"
                />
                <ActionButton
                  disabled={busy}
                  onPress={() => {
                    cancelClosure();
                  }}>
                  Manter vínculo
                </ActionButton>
              </>
            ) : (
              <>
                <OutcomeRow
                  icon="package-variant-closed"
                  text={'Pedido · ' + stateLabel(context.order.estado)}
                />
                {closed && (
                  <OutcomeRow
                    icon="plus-circle-outline"
                    text={
                      provisioning.estrategia === 'SDM'
                        ? 'Novo vínculo SDM exige configurar a NTAG novamente'
                        : 'Escolha outro pedido Cadastrado e releia a etiqueta'
                    }
                  />
                )}
                {administrative && !closed && !pending && (
                  <ActionButton
                    mode="outlined"
                    disabled={busy}
                    onPress={resume}>
                    Retomar configuração
                  </ActionButton>
                )}
                {administrative && pending && (
                  <ActionButton
                    textColor="#B42318"
                    disabled={busy}
                    onPress={askToClose}>
                    Encerrar vínculo
                  </ActionButton>
                )}
                <Details title="Dados do vínculo">
                  <VStack gap={8}>
                    <Text>{context.order.descricao}</Text>
                    <Text>{provisioning.modelo}</Text>
                    {!!provisioning.sdm && (
                      <Text>
                        Política:{' '}
                        {provisioning.sdm.politica === 'ESTRITA'
                          ? 'Estrita'
                          : 'Registro tardio'}
                      </Text>
                    )}
                    <Text selectable>
                      Provisionamento: {provisioning.id}
                      {'\n'}Pedido: {provisioning.pedidoId}
                    </Text>
                  </VStack>
                </Details>
                <ActionButton icon="refresh" disabled={busy} onPress={reload}>
                  Atualizar vínculo
                </ActionButton>
                <ActionButton disabled={busy} onPress={() => setScanning(true)}>
                  Outra etiqueta
                </ActionButton>
              </>
            )}
          </>
        ) : (
          !busy && (
            <SetupState
              icon="nfc-search-variant"
              title="Qual etiqueta?"
              description="Leia a etiqueta para consultar o pedido e seu vínculo atual."
            />
          )
        )}
        {!busy && !context && !!selection && (
          <ActionButton mode="outlined" onPress={reload}>
            Tentar novamente
          </ActionButton>
        )}
      </VStack>
    </Tela>
  );
}
