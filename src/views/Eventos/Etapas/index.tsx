import {showCommandFailure} from '../../../components/Base/Toast/service';
import {useEventCapture} from './use-event-capture';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {RotasTab} from '../../../navigation';
import type {RotasEventos} from '../../../navigation/EventosNavigator';
import {Text} from 'react-native-paper';
import {
  ActionButton as Button,
  Details,
  FlowSteps,
  PageHero,
  StatusPanel,
} from '../../../components/Tracking';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import SelecionarEvento from './SelecionarEvento';
import Leitor from '../../../components/Nfc/Leitor';
import {descricaoEnumTipoEvento} from '../../../domain/enums/tipoEvento';
import TagDetails from '../../../components/Nfc/TagDetails';
import {reasonLabel} from '../../../components/Tracking/labels';
import {SdmEvidence} from '../../../components/Tracking/SdmEvidence';
import {DecisionDetails} from '../../../components/Tracking/DecisionDetails';
import {captureStatus} from '../../../components/Tracking/capture-status';

export default function EtapasEvento() {
  const navigation = useNavigation<NativeStackNavigationProp<RotasEventos>>();
  const {
    type,
    reading,
    busy,
    savedId,
    message,
    capturedAt,
    saved,
    queue,
    captured,
    save,
    dispatch,
  } = useEventCapture();
  if (!type)
    return (
      <SelecionarEvento
        onSelecionarEvento={eventType =>
          dispatch({type: 'event-selected', eventType})
        }
      />
    );
  if (!reading)
    return (
      <Leitor
        insetTop={false}
        experimentType={type}
        context={descricaoEnumTipoEvento[type]}
        onVoltar={() => {
          dispatch({type: 'reset'});
        }}
        backLabel="Trocar etapa"
        onLeituraRealizada={captured}
        onErroLeitura={failureMessage =>
          dispatch({type: 'message', message: failureMessage})
        }
      />
    );
  const stored = saved?.state === 'STORED';
  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          compact
          eyebrow="REGISTRAR ETAPA"
          title={
            savedId
              ? 'Captura salva'
              : 'Confirmar ' + descricaoEnumTipoEvento[type].toLowerCase()
          }
          description={
            savedId
              ? 'Acompanhe o envio e a decisão da operação.'
              : 'Confira a etiqueta antes de salvar.'
          }
          icon={
            savedId ? 'content-save-check-outline' : 'clipboard-check-outline'
          }
        />
      }
      footer={
        !savedId ? (
          <Button
            mode="contained"
            loading={busy}
            disabled={busy || queue.loading || !!queue.error}
            onPress={() => {
              save().catch(showCommandFailure);
            }}>
            {'Confirmar ' + descricaoEnumTipoEvento[type].toLowerCase()}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() =>
              navigation
                .getParent<BottomTabNavigationProp<RotasTab>>()
                ?.navigate('Envios')
            }>
            Ver envios
          </Button>
        )
      }>
      <VStack gap={16}>
        <FlowSteps
          labels={['Escolher', 'Ler', 'Confirmar']}
          current={3}
          complete={!!savedId}
        />
        {!savedId && <Text>A captura será salva mesmo sem conexão.</Text>}
        {!!queue.error && <Text accessibilityRole="alert">{queue.error}</Text>}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {savedId && (
          <StatusPanel
            tone={
              stored
                ? saved?.businessState === 'ACCEPTED'
                  ? 'success'
                  : saved?.businessState === 'PENDING'
                  ? 'warning'
                  : 'error'
                : 'info'
            }>
            <VStack gap={10}>
              <Text variant="titleLarge" accessibilityRole="alert">
                {stored
                  ? 'Captura salva no histórico'
                  : 'Captura salva neste aparelho'}
              </Text>
              <Text variant="titleMedium">
                {saved
                  ? captureStatus(saved)
                  : 'Aguardando confirmação do servidor'}
              </Text>
              {!stored && (
                <Text>
                  Pode sair desta tela. A etapa aguarda autorização do servidor.
                </Text>
              )}
              {saved?.currentDecision && saved.businessState !== 'ACCEPTED' && (
                <Text>{reasonLabel(saved.currentDecision.decisao.motivo)}</Text>
              )}
              <SdmEvidence sdm={saved?.currentDecision?.decisao.sdm} />
              {saved?.currentDecision && (
                <DecisionDetails
                  decision={saved.currentDecision.decisao}
                  history={saved.currentDecision.historicoDecisoes}
                />
              )}
              {!!saved?.message && <Text>{saved.message}</Text>}
              <Details title="Comprovante">
                <Text selectable>Identificador: {savedId}</Text>
                <TagDetails reading={reading} capturedAt={capturedAt} />
                {saved?.metadata.cacheUsed && (
                  <Text>
                    Vínculo obtido do cache. A API confere sua validade no
                    envio.
                  </Text>
                )}
              </Details>
            </VStack>
          </StatusPanel>
        )}
        {!savedId && <TagDetails reading={reading} capturedAt={capturedAt} />}
        {!savedId && (
          <Button
            disabled={busy}
            onPress={() => {
              dispatch({type: 'rescan'});
            }}>
            Trocar etiqueta
          </Button>
        )}
        {stored && (
          <Button
            onPress={() =>
              navigation
                .getParent<BottomTabNavigationProp<RotasTab>>()
                ?.navigate('Historico', {reading})
            }>
            Ver histórico
          </Button>
        )}
        {savedId && (
          <Button
            onPress={() => {
              dispatch({type: 'reset'});
            }}>
            Nova etapa
          </Button>
        )}
      </VStack>
    </Tela>
  );
}
