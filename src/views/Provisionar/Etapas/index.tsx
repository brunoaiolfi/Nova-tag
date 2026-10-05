import {ActionButton as Button} from '../../../components/Tracking';
import React, {useState} from 'react';
import {RouteProp, useRoute} from '@react-navigation/native';
import {Checkbox, List, Text} from 'react-native-paper';
import {FlowSteps, StatusPanel} from '../../../components/Tracking';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import Leitor from '../../../components/Nfc/Leitor';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import type {
  Provisioning,
  Reading,
  OrderSummary,
} from '../../../appplication/traceability/workflow';
import {traceability} from '../../../infra/traceability/runtime';
import OrderSelect from '../../../components/Nfc/OrderSelect';
import ModelSelect from '../../../components/Nfc/ModelSelect';
import TagDetails from '../../../components/Nfc/TagDetails';

export default function EtapasProvisionamento() {
  const {estrategia} =
    useRoute<RouteProp<RotasProvisionar, 'EtapasProvisionamento'>>().params;
  const [order, setOrder] = useState<OrderSummary>();
  const [model, setModel] = useState('DESCONHECIDO');
  const [reading, setReading] = useState<Reading>();
  const [capturedAt, setCapturedAt] = useState<string>();
  const [provisioning, setProvisioning] = useState<Provisioning>();
  const [verified, setVerified] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<'form' | 'read' | 'write'>('form');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const strategy =
    estrategia === EnumEstrategiasNFC.UID ? 'UID' : 'NDEF_ESTATICO';
  async function register() {
    if (!reading || !order || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await traceability.register(
        order.codigo,
        reading,
        strategy,
        model,
      );
      setProvisioning(result);
      setVerified(strategy === 'UID' || reading.ndef === result.referenciaNdef);
      setMessage(
        result.status === 'ATIVA'
          ? 'Vínculo já ativo.'
          : 'Vínculo registrado. Confira a configuração física antes de ativar.',
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function activate() {
    if (!provisioning || !reading || busy) {
      return;
    }
    setBusy(true);
    try {
      setProvisioning(
        await traceability.activate(provisioning, reading, confirmed),
      );
      setMessage(
        'Etiqueta ativa. Provisionamento registrado no histórico do pedido.',
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (mode !== 'form') {
    return (
      <Leitor
        context={`${order?.codigo} · ${
          mode === 'write' ? '3. Gravar referência' : '2. Ler etiqueta'
        }`}
        onVoltar={() => setMode('form')}
        write={
          mode === 'write' && provisioning?.referenciaNdef
            ? {uid: provisioning.uid, reference: provisioning.referenciaNdef}
            : undefined
        }
        onLeituraRealizada={(value, time) => {
          setReading(value);
          setCapturedAt(time);
          if (mode === 'write') {
            setVerified(true);
          }
          setMode('form');
          setMessage('Etiqueta lida fisicamente.');
        }}
        onErroLeitura={setMessage}
      />
    );
  }
  return (
    <Tela scroll>
      <VStack gap={16}>
        <Text variant="headlineSmall">Vincular etiqueta ao pedido</Text>
        <FlowSteps
          labels={['Pedido', 'Leitura', 'Vínculo', 'Ativação']}
          current={!order ? 1 : !reading ? 2 : !provisioning ? 3 : 4}
          complete={provisioning?.status === 'ATIVA'}
        />
        <Text>
          {strategy === 'UID'
            ? 'Por número da etiqueta (UID) · não grava NDEF'
            : 'Por referência NDEF · grava um identificador na etiqueta'}
        </Text>
        <OrderSelect
          selected={order}
          onSelect={setOrder}
          disabled={!!provisioning || busy}
        />
        {order && !provisioning && (
          <ModelSelect
            value={model}
            onChange={setModel}
            disabled={!!provisioning || busy}
          />
        )}
        {order && !provisioning && (
          <Button
            mode={reading ? 'outlined' : 'contained'}
            disabled={!order || busy}
            onPress={() => {
              setMessage('');
              setMode('read');
            }}>
            {reading ? 'Ler outra etiqueta' : '2. Ler etiqueta do pedido'}
          </Button>
        )}
        {reading && <TagDetails reading={reading} capturedAt={capturedAt} />}
        {reading && !provisioning && (
          <Button
            mode="contained"
            disabled={!reading || !order || !model.trim() || busy}
            loading={busy}
            onPress={() => {
              void register();
            }}>
            3. Vincular etiqueta ao pedido
          </Button>
        )}
        {provisioning && (
          <>
            <StatusPanel
              tone={provisioning.status === 'ATIVA' ? 'success' : 'warning'}>
              <VStack gap={12}>
                <Text variant="titleLarge">
                  {provisioning.status === 'ATIVA'
                    ? 'Etiqueta pronta para uso'
                    : 'Vínculo salvo · falta ativar'}
                </Text>
                <Text>
                  {provisioning.status === 'ATIVA'
                    ? `Agora você pode registrar etapas para ${order?.codigo} na aba Registrar.`
                    : 'O pedido ainda não aceita eventos desta etiqueta. Conclua a configuração abaixo. Se sair, selecione o mesmo pedido e leia a mesma tag para retomar.'}
                </Text>
                {provisioning.status !== 'ATIVA' && (
                  <>
                    {strategy === 'NDEF_ESTATICO' && !verified && (
                      <Button
                        mode="contained"
                        disabled={busy}
                        onPress={() => {
                          setConfirmed(false);
                          setMessage('');
                          setMode('write');
                        }}>
                        Gravar referência NDEF
                      </Button>
                    )}
                    <Text>
                      {strategy === 'UID'
                        ? 'UID conferido. '
                        : verified
                        ? 'Referência NDEF gravada e conferida. '
                        : 'Primeiro grave e confira o NDEF. '}
                      Antes de ativar, confira a configuração física e o
                      bloqueio definidos para seu ensaio com a ferramenta usada
                      para configurar a tag. Este aplicativo não bloqueia a
                      escrita.
                    </Text>
                    <Checkbox.Item
                      label="Conferi a configuração física e o bloqueio do ensaio"
                      status={confirmed ? 'checked' : 'unchecked'}
                      onPress={() => setConfirmed(!confirmed)}
                      disabled={busy}
                    />
                    <Button
                      mode="contained"
                      disabled={!verified || !confirmed || busy}
                      loading={busy}
                      onPress={() => {
                        void activate();
                      }}>
                      4. Ativar etiqueta
                    </Button>
                  </>
                )}
                <List.Accordion title="Detalhes do vínculo">
                  <Text selectable>{provisioning.id}</Text>
                  <Text>Situação: {provisioning.status}</Text>
                </List.Accordion>
              </VStack>
            </StatusPanel>
            {provisioning.status === 'ATIVA' && (
              <Button
                mode="contained"
                onPress={() => {
                  setOrder(undefined);
                  setReading(undefined);
                  setProvisioning(undefined);
                  setCapturedAt(undefined);
                  setVerified(false);
                  setConfirmed(false);
                  setModel('DESCONHECIDO');
                  setMessage('');
                }}>
                Vincular outra etiqueta
              </Button>
            )}
          </>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </Tela>
  );
}
