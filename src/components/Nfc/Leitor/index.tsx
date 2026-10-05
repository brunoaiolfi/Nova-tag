import React, {useEffect, useRef, useState} from 'react';
import {Button, Icon, Text} from 'react-native-paper';
import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {
  cancelPhysicalRead,
  physicalNfcAvailable,
  readPhysicalTag,
} from '../../../infra/nfc/reader';
import type {Reading} from '../../../appplication/traceability/workflow';
import TagDetails from '../TagDetails';

type Props = {
  write?: {uid: string; reference: string};
  onLeituraRealizada: (reading: Reading, capturedAt: string) => void;
  onErroLeitura: (message: string) => void;
  onVoltar?: () => void;
  continueLabel?: string;
  context?: string;
  onVerHistorico?: (reading: Reading, capturedAt: string) => void;
};
export default function Leitor({
  write,
  onLeituraRealizada,
  onErroLeitura,
  onVoltar,
  continueLabel = 'Continuar com esta etiqueta',
  context,
  onVerHistorico,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{
    reading: Reading;
    capturedAt: string;
  }>();
  const mounted = useRef(true);
  const running = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void cancelPhysicalRead();
    };
  }, []);
  async function read() {
    if (running.current) {
      return;
    }
    running.current = true;
    cancelled.current = false;
    setBusy(true);
    setResult(undefined);
    setMessage('');
    try {
      const reading = await readPhysicalTag(write);
      if (mounted.current && !cancelled.current) {
        setResult({reading, capturedAt: new Date().toISOString()});
      }
    } catch (error) {
      if (mounted.current && !cancelled.current) {
        const detail =
          error instanceof Error
            ? error.message
            : 'Leitura cancelada ou etiqueta não compatível. Tente novamente.';
        setMessage(detail);
        onErroLeitura(detail);
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return (
    <Tela scroll>
      <VStack gap={16}>
        {!!context && <Text variant="labelLarge">{context}</Text>}
        <Icon source={result ? 'check-circle-outline' : 'nfc-tap'} size={56} />
        <Text variant="headlineSmall">
          {result
            ? write
              ? 'Gravação conferida'
              : 'Leitura concluída'
            : write
            ? 'Gravar referência NDEF'
            : 'Escanear etiqueta NFC'}
        </Text>
        {!result && (
          <Text>
            {write
              ? 'A gravação substitui o conteúdo NDEF atual. Use a mesma etiqueta registrada e mantenha-a próxima até a releitura terminar.'
              : '1. Toque em Ler etiqueta.\n2. Encoste a tag na parte superior do iPhone, perto da câmera.\n3. Mantenha-a parada até a leitura terminar.'}
          </Text>
        )}
        {!write && !result && (
          <Text>
            A leitura apenas consulta os dados. Nada será gravado na etiqueta ou
            enviado ao pedido.
          </Text>
        )}
        {!physicalNfcAvailable && (
          <Text>
            Instale o aplicativo de desenvolvimento Nova-tag com NFC. Esta
            função não está disponível no Expo Go ou no navegador.
          </Text>
        )}
        {result ? (
          <>
            <Text>
              Você já pode afastar a etiqueta. Confira os dados abaixo; esta
              tela ficará aberta até você continuar.
            </Text>
            <TagDetails
              reading={result.reading}
              capturedAt={result.capturedAt}
            />
            <Button
              mode="contained"
              onPress={() =>
                onLeituraRealizada(result.reading, result.capturedAt)
              }>
              {continueLabel}
            </Button>
            {onVerHistorico && (
              <Button
                mode="outlined"
                onPress={() =>
                  onVerHistorico(result.reading, result.capturedAt)
                }>
                Ver histórico desta etiqueta
              </Button>
            )}
            <Button
              onPress={() => {
                void read();
              }}>
              {write ? 'Gravar e conferir novamente' : 'Ler outra etiqueta'}
            </Button>
          </>
        ) : (
          <Button
            mode="contained"
            disabled={busy || !physicalNfcAvailable}
            loading={busy}
            onPress={() => {
              void read();
            }}>
            {write ? 'Gravar e conferir etiqueta' : 'Ler etiqueta'}
          </Button>
        )}
        {busy && (
          <Text accessibilityRole="alert">
            Aguardando a etiqueta… Se não reconhecer, afaste a tag e aproxime
            novamente.
          </Text>
        )}
        {busy && (
          <Button
            onPress={() => {
              cancelled.current = true;
              setMessage(
                'Leitura cancelada. Toque em Ler etiqueta para tentar novamente.',
              );
              void cancelPhysicalRead();
            }}>
            Cancelar leitura
          </Button>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {onVoltar && (
          <Button disabled={busy} onPress={onVoltar}>
            Voltar
          </Button>
        )}
      </VStack>
    </Tela>
  );
}
