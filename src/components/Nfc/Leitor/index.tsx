import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../Tracking';
import React, {useEffect, useRef, useState} from 'react';
import {Icon, Text} from 'react-native-paper';
import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {
  cancelPhysicalRead,
  physicalNfcAvailable,
  readPhysicalTag,
} from '../../../infra/nfc/reader';
import type {Reading} from '../../../appplication/traceability/workflow';
import TagDetails from '../TagDetails';
import {View} from 'react-native';
import {FlowSteps, PageHero, StatusPanel} from '../../Tracking';

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
    <Tela
      scroll
      footer={
        result ? (
          <Button
            mode="contained"
            onPress={() =>
              onVerHistorico
                ? onVerHistorico(result.reading, result.capturedAt)
                : onLeituraRealizada(result.reading, result.capturedAt)
            }>
            {onVerHistorico ? 'Ver histórico desta etiqueta' : continueLabel}
          </Button>
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
        )
      }>
      <VStack gap={16}>
        {!!context && <Text variant="labelLarge">{context}</Text>}
        <PageHero
          title={
            result
              ? write
                ? 'Gravação conferida'
                : 'Leitura concluída'
              : write
              ? 'Gravar referência NDEF'
              : 'Vamos ler a etiqueta.'
          }
          description={
            result
              ? 'Você já pode afastar a etiqueta. O resultado fica aqui até você continuar.'
              : 'Use a parte superior do iPhone, perto da câmera.'
          }
          icon={result ? 'check-circle-outline' : 'nfc-tap'}
          eyebrow="LEITURA DA ETIQUETA"
        />
        <FlowSteps
          labels={['Iniciar', 'Aproximar', 'Conferir']}
          current={result ? 3 : busy ? 2 : 1}
          complete={!!result}
        />
        {!result && (
          <View style={layoutStyles.scanInstructions}>
            <View style={layoutStyles.scanTarget}>
              <Icon source="cellphone-nfc" size={64} color="#155EEF" />
            </View>
            <Text variant="titleMedium" style={layoutStyles.instructionTitle}>
              {busy
                ? 'Mantenha a etiqueta parada'
                : 'Toque no botão e aproxime a etiqueta'}
            </Text>
            <Text style={layoutStyles.instructionText}>
              {write
                ? 'O conteúdo NDEF atual será substituído. Use a mesma etiqueta e aguarde a gravação e a releitura.'
                : 'Aguarde a confirmação do iPhone antes de afastar a etiqueta.'}
            </Text>
          </View>
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
            <TagDetails
              reading={result.reading}
              capturedAt={result.capturedAt}
            />
            {onVerHistorico && (
              <Button
                mode="outlined"
                onPress={() =>
                  onLeituraRealizada(result.reading, result.capturedAt)
                }>
                {continueLabel}
              </Button>
            )}
            <Button
              onPress={() => {
                void read();
              }}>
              {write ? 'Gravar e conferir novamente' : 'Ler outra etiqueta'}
            </Button>
          </>
        ) : null}
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
        {!!message && (
          <StatusPanel tone="warning">
            <Text accessibilityRole="alert">{message}</Text>
          </StatusPanel>
        )}
        {onVoltar && (
          <Button disabled={busy} onPress={onVoltar}>
            Voltar
          </Button>
        )}
      </VStack>
    </Tela>
  );
}

const layoutStyles = StyleSheet.create({
  scanInstructions: {alignItems: 'center', paddingVertical: 18, gap: 14},
  scanTarget: {
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#155EEF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FA',
  },
  instructionTitle: {textAlign: 'center', fontWeight: '700'},
  instructionText: {textAlign: 'center'},
});
