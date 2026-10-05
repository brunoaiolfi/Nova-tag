import React, {useRef, useState} from 'react';
import {Button, Card, List, Text} from 'react-native-paper';
import * as Crypto from 'expo-crypto';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import SelecionarEvento from './SelecionarEvento';
import Leitor from '../../../components/Nfc/Leitor';
import {
  EnumTipoEvento,
  descricaoEnumTipoEvento,
} from '../../../domain/enums/tipoEvento';
import TagDetails from '../../../components/Nfc/TagDetails';
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

const reasons: Record<string, string> = {
  ACEITA: 'O evento está de acordo com a sequência logística do pedido.',
  SEQUENCIA_INVALIDA:
    'Este evento não é permitido no estado atual do pedido. Confira se as etapas anteriores já foram registradas.',
  VINCULO_INATIVO:
    'A etiqueta precisa estar ativa. Conclua o provisionamento antes de registrar eventos.',
  VINCULO_NAO_ENCONTRADO: 'O vínculo desta etiqueta não foi encontrado.',
  UID_DIVERGENTE: 'O número da etiqueta lida é diferente do número cadastrado.',
  NDEF_DIVERGENTE:
    'A referência NDEF lida é diferente da referência do vínculo.',
  MODELO_DIVERGENTE: 'O modelo informado diverge do modelo cadastrado.',
  EVENTO_RESERVADO:
    'O provisionamento é registrado somente ao ativar a etiqueta.',
};

export default function EtapasEvento() {
  const [type, setType] = useState<EnumTipoEvento>();
  const [reading, setReading] = useState<Reading>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Decision>();
  const [message, setMessage] = useState('');
  const [attempted, setAttempted] = useState(false);
  const running = useRef(false);
  const pending = useRef<
    | {
        id: string;
        occurredAt: string;
        userId: string;
        observation?: Observation;
      }
    | undefined
  >(undefined);
  function captured(value: Reading, capturedAt: string) {
    const user = sessionManager.getSnapshot().session?.user;
    if (!user) {
      setMessage('Entre novamente para registrar a captura.');
      return;
    }
    pending.current = {
      id: Crypto.randomUUID(),
      occurredAt: capturedAt,
      userId: user.id,
    };
    setReading(value);
  }
  async function send() {
    const intent = pending.current;
    if (!reading || !type || !intent || running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      intent.observation ??= await traceability.prepare(
        reading,
        type,
        intent.id,
        intent.occurredAt,
        await installationId(),
      );
      setAttempted(true);
      const decision = await traceability.send(
        intent.observation,
        intent.userId,
      );
      setResult(decision);
    } catch (error) {
      setMessage(
        `${
          (error as Error).message
        } Ao tentar novamente nesta tela, a captura mantém o mesmo identificador.`,
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  if (!type) {
    return <SelecionarEvento onSelecionarEvento={setType} />;
  }
  if (!reading) {
    return (
      <Leitor
        context={`2. Ler etiqueta · ${descricaoEnumTipoEvento[type]}`}
        onVoltar={() => {
          setType(undefined);
          setMessage('');
        }}
        onLeituraRealizada={captured}
        onErroLeitura={setMessage}
      />
    );
  }
  return (
    <Tela scroll>
      <VStack gap={16}>
        <Text variant="headlineSmall">
          {result
            ? 'Resultado do registro'
            : `3. Confirmar ${descricaoEnumTipoEvento[type]}`}
        </Text>
        {!result && (
          <Text>
            A leitura foi concluída. O evento só será enviado quando você
            confirmar abaixo. Operador e dispositivo são preenchidos
            automaticamente.
          </Text>
        )}
        {!result && (
          <TagDetails
            reading={reading}
            capturedAt={pending.current?.occurredAt}
          />
        )}
        {!result && (
          <Button
            mode="contained"
            disabled={busy}
            loading={busy}
            onPress={() => {
              void send();
            }}>
            {attempted
              ? 'Tentar envio novamente'
              : `Confirmar ${descricaoEnumTipoEvento[type].toLowerCase()}`}
          </Button>
        )}
        {!result && (
          <Text>
            Se perder a conexão, mantenha esta tela aberta e tente o envio
            novamente. O mesmo registro será reenviado, sem duplicar a operação.
          </Text>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {!result && !attempted && (
          <Button
            disabled={busy}
            onPress={() => {
              setReading(undefined);
              pending.current = undefined;
              setMessage('');
            }}>
            Ler outra etiqueta antes de enviar
          </Button>
        )}
        {result && (
          <>
            <Card mode="outlined">
              <Card.Content>
                <VStack gap={12}>
                  <Text variant="titleLarge" accessibilityRole="alert">
                    {result.armazenada
                      ? 'Captura salva no histórico'
                      : 'Captura não armazenada'}
                  </Text>
                  <Text variant="titleMedium">
                    {result.decisao.autorizada
                      ? `Operação autorizada · ${descricaoEnumTipoEvento[type]}`
                      : 'Operação rejeitada · pedido não alterado'}
                  </Text>
                  <Text>
                    {reasons[result.decisao.motivo] ??
                      `Motivo informado pelo servidor: ${result.decisao.motivo}`}
                  </Text>
                  <Text>
                    {result.decisao.classificacao === 'SUSPEITO'
                      ? 'Leitura suspeita: confira os dados da etiqueta antes de prosseguir.'
                      : 'Leitura sem divergências identificadas.'}
                  </Text>
                  {result.decisao.avisos.map((warning, index) => (
                    <Text key={`${warning}-${index}`}>
                      {reasons[warning] ?? warning}
                    </Text>
                  ))}
                  <List.Accordion title="Comprovante do registro">
                    <Text selectable>Identificador: {pending.current?.id}</Text>
                    <Text>Evento: {descricaoEnumTipoEvento[type]}</Text>
                    <Text>Motivo: {result.decisao.motivo}</Text>
                  </List.Accordion>
                </VStack>
              </Card.Content>
            </Card>
            <TagDetails
              reading={reading}
              capturedAt={pending.current?.occurredAt}
            />
            <Button
              mode="contained"
              onPress={() => {
                setType(undefined);
                setReading(undefined);
                setResult(undefined);
                setMessage('');
                setAttempted(false);
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
