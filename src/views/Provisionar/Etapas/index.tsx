import React, {useState} from 'react';
import {RouteProp, useRoute} from '@react-navigation/native';
import {Button, Checkbox, Text, TextInput} from 'react-native-paper';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import Leitor from '../../../components/Nfc/Leitor';
import type {RotasProvisionar} from '../../../navigation/ProvisionarNavigator';
import {EnumEstrategiasNFC} from '../../../domain/enums/estrategiasNFC';
import type {
  Provisioning,
  Reading,
} from '../../../appplication/traceability/workflow';
import {traceability} from '../../../infra/traceability/runtime';

export default function EtapasProvisionamento() {
  const {estrategia} =
    useRoute<RouteProp<RotasProvisionar, 'EtapasProvisionamento'>>().params;
  const [code, setCode] = useState('');
  const [model, setModel] = useState('');
  const [reading, setReading] = useState<Reading>();
  const [provisioning, setProvisioning] = useState<Provisioning>();
  const [verified, setVerified] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<'form' | 'read' | 'write'>('form');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const strategy =
    estrategia === EnumEstrategiasNFC.UID ? 'UID' : 'NDEF_ESTATICO';
  async function register() {
    if (!reading || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await traceability.register(
        code,
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
        write={
          mode === 'write' && provisioning?.referenciaNdef
            ? {uid: provisioning.uid, reference: provisioning.referenciaNdef}
            : undefined
        }
        onLeituraRealizada={value => {
          setReading(value);
          if (mode === 'write') {
            setVerified(true);
          }
          setMode('form');
          setMessage('Etiqueta lida fisicamente.');
        }}
        onErroLeitura={value => {
          setMessage(value);
          setMode('form');
        }}
      />
    );
  }
  return (
    <Tela scroll>
      <VStack gap={16}>
        <Text variant="headlineSmall">Provisionar por {strategy}</Text>
        <TextInput
          label="Código do pedido existente"
          value={code}
          onChangeText={setCode}
          editable={!provisioning && !busy}
          autoCapitalize="characters"
        />
        <TextInput
          label="Modelo declarado da etiqueta"
          value={model}
          onChangeText={setModel}
          editable={!provisioning && !busy}
        />
        {!provisioning && (
          <Button
            disabled={!code.trim() || !model.trim() || busy}
            onPress={() => setMode('read')}>
            Ler etiqueta
          </Button>
        )}
        {reading && (
          <Text>
            UID: {reading.uid}
            {reading.ndef ? `\nNDEF: ${reading.ndef}` : ''}
          </Text>
        )}
        {!provisioning && (
          <Button
            mode="contained"
            disabled={!reading || !code.trim() || !model.trim() || busy}
            loading={busy}
            onPress={() => {
              void register();
            }}>
            Registrar vínculo na API
          </Button>
        )}
        {provisioning && (
          <>
            <Text>
              Vínculo: {provisioning.id}
              {'\n'}Situação: {provisioning.status}
            </Text>
            {provisioning.status !== 'ATIVA' && (
              <>
                {strategy === 'NDEF_ESTATICO' && !verified && (
                  <Button disabled={busy} onPress={() => setMode('write')}>
                    Gravar referência do servidor na etiqueta
                  </Button>
                )}
                <Text>
                  Esta versão lê e grava NDEF. Não altera chaves nem bloqueia a
                  escrita. Confirme abaixo apenas se a configuração e o bloqueio
                  exigidos no seu ensaio foram verificados externamente.
                </Text>
                <Checkbox.Item
                  label="Configuração física e bloqueio conferidos"
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
                  Ativar vínculo
                </Button>
              </>
            )}
          </>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </Tela>
  );
}
