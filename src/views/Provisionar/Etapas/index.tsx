import {useProvisioningFlow} from './use-provisioning-flow';
import {ActionButton as Button} from '../../../components/Tracking';
import React from 'react';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {Confirmation} from '../../../components/Nfc/SetupControls';
import {
  Details,
  FlowSteps,
  PageHero,
  StatusPanel,
} from '../../../components/Tracking';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import Leitor from '../../../components/Nfc/Leitor';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import OrderSelect from '../../../components/Nfc/OrderSelect';
import ModelSelect from '../../../components/Nfc/ModelSelect';
import TagDetails from '../../../components/Nfc/TagDetails';
import CreateOrderForm from '../../../components/Nfc/CreateOrderForm';

export default function EtapasProvisionamento() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RotasProvisionar>>();
  const {estrategia, expectedUid, registeredModel} =
    useRoute<RouteProp<RotasProvisionar, 'EtapasProvisionamento'>>().params;
  const strategy =
    estrategia === EnumEstrategiasNFC.UID ? 'UID' : 'NDEF_ESTATICO';
  const {
    order,
    model,
    reading,
    capturedAt,
    provisioning,
    verified,
    confirmed,
    mode,
    busy,
    message,
    selectOrder,
    capturedReading,
    setModel,
    setMode,
    setMessage,
    setConfirmed,
    reset,
    register,
    activate,
  } = useProvisioningFlow(strategy, expectedUid, registeredModel);
  if (mode === 'create') {
    return (
      <CreateOrderForm
        onCancel={() => setMode('form')}
        onCreated={created => {
          selectOrder(created);
          setMessage(
            `Pedido ${created.codigo} selecionado. Leia a etiqueta para continuar.`,
          );
        }}
      />
    );
  }
  if (mode !== 'form') {
    return (
      <Leitor
        insetTop={false}
        context={`${order?.codigo} · ${
          mode === 'write' ? '3. Gravar referência' : '2. Ler etiqueta'
        }`}
        onVoltar={() => setMode('form')}
        backLabel={mode === 'write' ? 'Voltar ao vínculo' : 'Voltar ao pedido'}
        write={
          mode === 'write' && provisioning?.referenciaNdef
            ? {uid: provisioning.uid, reference: provisioning.referenciaNdef}
            : undefined
        }
        onLeituraRealizada={capturedReading}
        onErroLeitura={setMessage}
      />
    );
  }
  if (!order)
    return (
      <OrderSelect
        insetTop={false}
        disabled={busy}
        onSelect={selectOrder}
        onCreate={() => setMode('create')}
      />
    );
  const active = provisioning?.status === 'ATIVA';
  function nextLink() {
    if (expectedUid) {
      navigation.popTo('InformativoEtapas');
      return;
    }
    reset();
  }
  return (
    <Tela
      keyboard
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          compact
          title={active ? 'Etiqueta ativa' : 'Vincular etiqueta'}
          description={
            active
              ? 'O pedido já pode receber etapas.'
              : !order
              ? 'Escolha o pedido.'
              : !reading
              ? 'Leia a etiqueta deste volume.'
              : !provisioning
              ? 'Confira o pedido e a etiqueta.'
              : 'Conclua a configuração para ativar.'
          }
          icon="nfc-tap"
        />
      }
      footer={
        active ? (
          <Button mode="contained" onPress={nextLink}>
            {expectedUid ? 'Concluir' : 'Novo vínculo'}
          </Button>
        ) : order ? (
          <Button
            mode="contained"
            disabled={
              busy ||
              (!provisioning && !!reading && !model.trim()) ||
              (!!provisioning && verified && !confirmed)
            }
            loading={busy}
            onPress={() => {
              if (!reading) {
                setMessage('');
                setMode('read');
              } else if (!provisioning) {
                void register();
              } else if (!verified) {
                setConfirmed(false);
                setMessage('');
                setMode(strategy === 'UID' ? 'read' : 'write');
              } else {
                void activate();
              }
            }}>
            {!reading
              ? 'Ler etiqueta'
              : !provisioning
              ? 'Vincular'
              : !verified
              ? strategy === 'UID'
                ? 'Reler etiqueta'
                : 'Gravar NDEF'
              : 'Ativar etiqueta'}
          </Button>
        ) : undefined
      }>
      <VStack gap={16}>
        <FlowSteps
          labels={['Pedido', 'Leitura', 'Vínculo', 'Ativação']}
          current={!order ? 1 : !reading ? 2 : !provisioning ? 3 : 4}
          complete={active}
        />
        <OrderSelect
          selected={order}
          onSelect={selectOrder}
          disabled={!!provisioning || busy}
          onCreate={() => setMode('create')}
        />
        {order && !reading && !provisioning && (
          <ModelSelect
            value={model}
            onChange={setModel}
            disabled={!!registeredModel || busy}
          />
        )}
        {reading && !provisioning && (
          <>
            <TagDetails reading={reading} capturedAt={capturedAt} />
            <Button
              disabled={busy}
              onPress={() => {
                setMessage('');
                setMode('read');
              }}>
              Trocar etiqueta
            </Button>
          </>
        )}
        {provisioning && (
          <>
            <StatusPanel tone={active ? 'success' : 'warning'}>
              <Text variant="titleMedium">
                {active ? 'Pronta para registrar etapas' : 'Falta ativar'}
              </Text>
              {!active && (
                <Text>
                  {strategy === 'UID'
                    ? verified
                      ? 'UID conferido.'
                      : 'Remova a referência NDEF antiga com a ferramenta de configuração e releia a etiqueta.'
                    : verified
                    ? 'NDEF gravado e conferido.'
                    : 'Grave e confira a referência NDEF.'}
                </Text>
              )}
            </StatusPanel>
            {!active && (
              <>
                <Text>
                  Confira a configuração física e o bloqueio do ensaio. Este app
                  não bloqueia a escrita.
                </Text>
                <Confirmation
                  label="Conferi a configuração e o bloqueio"
                  checked={confirmed}
                  onPress={() => setConfirmed(!confirmed)}
                  disabled={busy || !verified}
                />
              </>
            )}
            <Button
              disabled={busy}
              onPress={() =>
                navigation.navigate('Gerenciar', {
                  provisioningId: provisioning.id,
                })
              }>
              Gerenciar vínculo
            </Button>
          </>
        )}
        <Details title="Dados do vínculo">
          <Text>
            Identificação:{' '}
            {strategy === 'UID' ? 'UID · sem gravação NDEF' : 'Referência NDEF'}
          </Text>
          {!!expectedUid && (
            <Text>
              Reutilização: {expectedUid}. O servidor atribui a nova época.
            </Text>
          )}
          <Text>Modelo declarado: {model}</Text>
          {provisioning && (
            <>
              <Text selectable>Vínculo: {provisioning.id}</Text>
              <Text>
                Época: {provisioning.epoca} · {provisioning.status}
              </Text>
              <Text selectable>UID: {provisioning.uid}</Text>
            </>
          )}
        </Details>
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </Tela>
  );
}
