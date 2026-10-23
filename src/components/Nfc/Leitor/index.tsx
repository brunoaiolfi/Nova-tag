import {useNfcReader} from './use-nfc-reader';
import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../Tracking';
import React from 'react';
import {Icon, Text} from 'react-native-paper';
import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import type {Reading} from '../../../domain/traceability/reading';
import type {Attempt} from '../../../domain/experimentation/attempt';
import TagDetails from '../TagDetails';
import {View} from 'react-native';
import {PageHero, StatusPanel, trackingColors as colors} from '../../Tracking';

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
  continueLabel = 'Continuar',
  context,
  onVerHistorico,
  insetTop = true,
  experimentType,
}: Props) {
  const {busy, message, result, physicalNfcAvailable, read, cancelReading} =
    useNfcReader({write, experimentType}, onErroLeitura);
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
                : 'Etiqueta lida'
              : write
              ? 'Gravar NDEF'
              : 'Ler etiqueta'
          }
          description={result ? 'Pode afastar a etiqueta.' : undefined}
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
            {onVerHistorico ? 'Ver histórico' : continueLabel}
          </Button>
        ) : (
          <Button
            mode="contained"
            disabled={busy || !physicalNfcAvailable}
            loading={busy}
            onPress={() => {
              void read();
            }}>
            {write ? 'Gravar NDEF' : 'Ler etiqueta'}
          </Button>
        )
      }>
      <VStack gap={16}>
        {!!context && <Text variant="labelLarge">{context}</Text>}
        {!result && (
          <View style={layoutStyles.scanInstructions}>
            <View style={layoutStyles.scanTarget}>
              <Icon source="cellphone-nfc" size={64} color={colors.blue} />
            </View>
            <Text variant="titleMedium" style={layoutStyles.instructionTitle}>
              {busy
                ? 'Mantenha a etiqueta parada'
                : 'Encoste no topo do iPhone'}
            </Text>
            <Text style={layoutStyles.instructionText}>
              {write
                ? 'O conteúdo NDEF atual será substituído. Use a mesma etiqueta e aguarde a gravação e a releitura.'
                : 'Aguarde a confirmação do iPhone antes de afastar a etiqueta.'}
            </Text>
          </View>
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
              {write ? 'Gravar novamente' : 'Ler outra etiqueta'}
            </Button>
          </>
        ) : null}
        {busy && <Text accessibilityRole="alert">Aguardando etiqueta…</Text>}
        {busy && (
          <Button
            onPress={() => {
              cancelReading();
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
