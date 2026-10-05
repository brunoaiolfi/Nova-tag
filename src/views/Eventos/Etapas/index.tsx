import React, {useRef, useState} from 'react';
import {Button, Text} from 'react-native-paper';
import * as Crypto from 'expo-crypto';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import SelecionarEvento from './SelecionarEvento';
import Leitor from '../../../components/Nfc/Leitor';
import {EnumTipoEvento} from '../../../domain/enums/tipoEvento';
import type {
  Decision,
  Observation,
  Reading,
} from '../../../appplication/traceability/workflow';
import {
  traceability,
  installationId,
} from '../../../infra/traceability/runtime';
import {sessionManager} from '../../../infra/auth/runtime';

export default function EtapasEvento() {
  const [type, setType] = useState<EnumTipoEvento>();
  const [reading, setReading] = useState<Reading>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Decision>();
  const [message, setMessage] = useState('');
  const pending = useRef<
    | {
        id: string;
        occurredAt: string;
        userId: string;
        observation?: Observation;
      }
    | undefined
  >(undefined);
  function captured(value: Reading) {
    const user = sessionManager.getSnapshot().session?.user;
    if (!user) {
      setMessage('Entre novamente para registrar a captura.');
      return;
    }
    pending.current = {
      id: Crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: user.id,
    };
    setReading(value);
  }
  async function send() {
    const intent = pending.current;
    if (!reading || !type || !intent || busy) {
      return;
    }
    setBusy(true);
    try {
      intent.observation ??= await traceability.prepare(
        reading,
        type,
        intent.id,
        intent.occurredAt,
        await installationId(),
      );
      const decision = await traceability.send(
        intent.observation,
        intent.userId,
      );
      setResult(decision);
      setMessage(
        decision.decisao.autorizada
          ? 'Captura armazenada. Operação autorizada.'
          : `Captura armazenada. Operação rejeitada: ${decision.decisao.motivo}.`,
      );
    } catch (error) {
      setMessage(
        `${
          (error as Error).message
        } Ao tentar novamente nesta tela, a captura mantém o mesmo identificador.`,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!type) {
    return <SelecionarEvento onSelecionarEvento={setType} />;
  }
  if (!reading) {
    return <Leitor onLeituraRealizada={captured} onErroLeitura={setMessage} />;
  }
  return (
    <Tela scroll>
      <VStack gap={16}>
        <Text variant="headlineSmall">Confirmar {type}</Text>
        <Text>
          UID: {reading.uid}
          {'\n'}NDEF: {reading.ndef ?? 'Sem referência'}
          {'\n'}Captura: {pending.current?.id}
        </Text>
        {!result && (
          <Button
            mode="contained"
            disabled={busy}
            loading={busy}
            onPress={() => {
              void send();
            }}>
            Enviar captura à API
          </Button>
        )}
        {!result && (
          <Text>
            Mantenha esta tela aberta se perder a conexão ou a resposta. O
            reenvio usa a mesma captura. Ainda não há fila offline persistente.
          </Text>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {result && (
          <>
            <Text>
              Classificação: {result.decisao.classificacao}
              {'\n'}Motivo: {result.decisao.motivo}
              {'\n'}
              {result.decisao.avisos.join('\n')}
            </Text>
            <Button
              onPress={() => {
                setType(undefined);
                setReading(undefined);
                setResult(undefined);
                setMessage('');
                pending.current = undefined;
              }}>
              Nova captura
            </Button>
          </>
        )}
      </VStack>
    </Tela>
  );
}
