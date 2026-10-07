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
import type {Attempt} from '../../../domain/experimentation/types';
import {experimentJournal} from '../../../infra/offline/runtime';
import TagDetails from '../TagDetails';
import {View} from 'react-native';
import {
  FlowSteps,
  PageHero,
  StatusPanel,
  trackingColors as colors,
} from '../../Tracking';

type Props = {
  write?: {uid: string; reference: string};
  onLeituraRealizada: (
    reading: Reading,
    capturedAt: string,
    attempt?: Attempt | null,
  ) => void;
  experimentType?: string;
  onErroLeitura: (message: string) => void;
  onVoltar?: () => void;
  backLabel?: string;
  continueLabel?: string;
  context?: string;
  onVerHistorico?: (reading: Reading, capturedAt: string) => void;
  insetTop?: boolean;
};
export default function Leitor({
  write,
  onLeituraRealizada,
  onErroLeitura,
  onVoltar,
  backLabel = 'Voltar',
  continueLabel = 'Continuar com esta etiqueta',
  context,
  onVerHistorico,
  insetTop = true,
  experimentType,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{
    reading: Reading;
    capturedAt: string;
    attempt?: Attempt | null;
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
    let attempt: Attempt | null = null;
    let started = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let terminalSaved = false;
    try {
      if (experimentType)
        attempt = await experimentJournal.start(experimentType);
      // The journal commit precedes the SDK call and is excluded from the NFC session duration.
      started = experimentJournal.clock.nowMs();
      if (cancelled.current || !mounted.current) {
        await experimentJournal.finish(
          attempt,
          started,
          false,
          'NFC_CANCELADO',
        );
        terminalSaved = true;
        return;
      }
      if (attempt?.plan.timeoutMs)
        timer = setTimeout(() => {
          timedOut = true;
          void cancelPhysicalRead();
        }, attempt.plan.timeoutMs);
      const reading = await readPhysicalTag(write);
      const capturedAt = new Date().toISOString();
      if (timer) clearTimeout(timer);
      await experimentJournal.finish(
        attempt,
        started,
        !timedOut && !cancelled.current,
        timedOut ? 'NFC_TIMEOUT' : cancelled.current ? 'NFC_CANCELADO' : 'OK',
      );
      terminalSaved = true;
      if (timedOut)
        throw new Error('Tempo de leitura esgotado. Tente novamente.');
      if (mounted.current && !cancelled.current) {
        setResult({reading, capturedAt, attempt});
      }
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (!terminalSaved)
        await experimentJournal
          .finish(
            attempt,
            started,
            false,
            timedOut || (error as {code?: string})?.code === 'NFC_TIMEOUT'
              ? 'NFC_TIMEOUT'
              : cancelled.current
              ? 'NFC_CANCELADO'
              : 'NFC_ERRO',
          )
          .catch(() => {});
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
      insetTop={insetTop}
      header={
        <PageHero
          fullBleed
          compact={!insetTop}
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
      }
      footer={
        result ? (
          <Button
            mode="contained"
            onPress={() =>
              onVerHistorico
                ? onVerHistorico(result.reading, result.capturedAt)
                : onLeituraRealizada(
                    result.reading,
                    result.capturedAt,
                    result.attempt,
                  )
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
        <FlowSteps
          labels={['Iniciar', 'Aproximar', 'Conferir']}
          current={result ? 3 : busy ? 2 : 1}
          complete={!!result}
        />
        {!result && (
          <View style={layoutStyles.scanInstructions}>
            <View style={layoutStyles.scanTarget}>
              <Icon source="cellphone-nfc" size={64} color={colors.blue} />
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
                  onLeituraRealizada(
                    result.reading,
                    result.capturedAt,
                    result.attempt,
                  )
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
          <Button icon="chevron-left" disabled={busy} onPress={onVoltar}>
            {backLabel}
          </Button>
        )}
      </VStack>
    </Tela>
  );
}

const layoutStyles = StyleSheet.create({
  scanInstructions: {alignItems: 'center', paddingVertical: 8, gap: 10},
  scanTarget: {
    height: 104,
    width: 104,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: '#F8F0E4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pale,
  },
  instructionTitle: {textAlign: 'center', fontWeight: '700'},
  instructionText: {textAlign: 'center', color: colors.muted, lineHeight: 24},
});
