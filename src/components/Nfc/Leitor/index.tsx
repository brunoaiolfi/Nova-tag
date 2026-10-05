import React, {useEffect, useRef, useState} from 'react';
import {Button, Text} from 'react-native-paper';
import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {
  cancelPhysicalRead,
  physicalNfcAvailable,
  readPhysicalTag,
} from '../../../infra/nfc/reader';
import type {Reading} from '../../../appplication/traceability/workflow';

type Props = {
  write?: {uid: string; reference: string};
  onLeituraRealizada: (reading: Reading) => void;
  onErroLeitura: (message: string) => void;
};
export default function Leitor({
  write,
  onLeituraRealizada,
  onErroLeitura,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void cancelPhysicalRead();
    };
  }, []);
  async function read() {
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const reading = await readPhysicalTag(write);
      if (mounted.current) {
        onLeituraRealizada(reading);
      }
    } catch (error) {
      if (mounted.current) {
        const detail =
          error instanceof Error
            ? error.message
            : 'Leitura cancelada ou etiqueta não compatível. Tente novamente.';
        setMessage(detail);
        onErroLeitura(detail);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return (
    <Tela>
      <VStack gap={16}>
        <Text variant="headlineSmall">
          {write ? 'Gravar referência NDEF' : 'Ler etiqueta NFC'}
        </Text>
        <Text>
          {write
            ? 'A gravação substitui o conteúdo NDEF atual. Use a mesma etiqueta registrada e mantenha-a próxima até a releitura terminar.'
            : 'Toque em Ler etiqueta e aproxime a tag da parte superior do iPhone.'}
        </Text>
        {!physicalNfcAvailable && (
          <Text>
            Instale o aplicativo de desenvolvimento Nova-tag com NFC. Esta
            função não está disponível no Expo Go ou no navegador.
          </Text>
        )}
        <Button
          mode="contained"
          disabled={busy || !physicalNfcAvailable}
          loading={busy}
          onPress={() => {
            void read();
          }}>
          {write ? 'Gravar e conferir etiqueta' : 'Ler etiqueta'}
        </Button>
        {busy && (
          <Button
            onPress={() => {
              void cancelPhysicalRead();
            }}>
            Cancelar leitura
          </Button>
        )}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </VStack>
    </Tela>
  );
}
