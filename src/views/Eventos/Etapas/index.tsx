import React, {useRef, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {RotasTab} from '../../../navigation';
import type {RotasEventos} from '../../../navigation/EventosNavigator';
import {Text} from 'react-native-paper';
import {
  ActionButton as Button,
  FlowSteps,
  PageHero,
  StatusPanel,
} from '../../../components/Tracking';
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
import type {Reading} from '../../../domain/traceability/types';
import {installationId} from '../../../infra/traceability/runtime';
import {sessionManager} from '../../../infra/auth/runtime';
import {useOffline} from '../../../components/Offline/OfflineProvider';
import {reasonLabel} from '../../traceability-labels';
import {SdmEvidence} from '../../../components/Tracking/SdmEvidence';
import {DecisionDetails} from '../../../components/Tracking/DecisionDetails';
import {captureStatus} from '../../Envios';
import type {CaptureOwner} from '../../../domain/offline/types';
import type {Attempt} from '../../../domain/experimentation/types';

export default function EtapasEvento() {
  const navigation = useNavigation<NativeStackNavigationProp<RotasEventos>>();
  const queue = useOffline();
  const [type, setType] = useState<EnumTipoEvento>();
  const [reading, setReading] = useState<Reading>();
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string>();
  const [message, setMessage] = useState('');
  const running = useRef(false);
  const pending = useRef<
    | {
        id: string;
        occurredAt: string;
        owner: CaptureOwner;
        attempt?: Attempt | null;
      }
    | undefined
  >(undefined);
  const saved = queue.items.find(item => item.id === savedId);
  function captured(
    value: Reading,
    capturedAt: string,
    attempt?: Attempt | null,
  ) {
    const session = sessionManager.getSnapshot().session;
    if (!session) {
      setMessage('Entre novamente para registrar a captura.');
      return;
    }
    pending.current = {
      id: Crypto.randomUUID(),
      occurredAt: capturedAt,
      owner: {userId: session.user.id, baseUrl: session.baseUrl},
      attempt,
    };
    setReading(JSON.parse(JSON.stringify(value)));
    setSavedId(undefined);
  }
  async function save() {
    const intent = pending.current;
    if (!reading || !type || !intent || running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      const device = await installationId();
      const capture = await queue.manager.capture(
        reading,
        type,
        intent.id,
        intent.occurredAt,
        device,
        intent.owner,
        intent.attempt,
      );
      setSavedId(capture.id);
      void queue.manager.synchronize();
    } catch (error) {
      setMessage(
        (error as Error).message +
          ' A captura só estará confirmada depois de ser salva neste aparelho.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  if (!type) return <SelecionarEvento onSelecionarEvento={setType} />;
  if (!reading)
    return (
      <Leitor
        insetTop={false}
        experimentType={type}
        context={'2. Ler etiqueta · ' + descricaoEnumTipoEvento[type]}
        onVoltar={() => {
          setType(undefined);
          setMessage('');
        }}
        backLabel="Trocar etapa"
        onLeituraRealizada={captured}
        onErroLeitura={setMessage}
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
              : '3. Confirmar ' + descricaoEnumTipoEvento[type]
          }
          description={
            savedId
              ? 'Acompanhe o envio e a decisão da operação.'
              : 'Confira a leitura. Ela será salva antes de tentar o envio.'
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
              void save();
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
            Acompanhar em Envios
          </Button>
        )
      }>
      <VStack gap={16}>
        <FlowSteps
          labels={['Escolher', 'Ler', 'Confirmar']}
          current={3}
          complete={!!savedId}
        />
        {!savedId && (
          <Text>
            Ao confirmar, o registro ficará salvo neste aparelho mesmo sem
            conexão. Operador, horário e dispositivo serão preservados.
          </Text>
        )}
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
                  Você já pode sair desta tela. O registro permanece salvo após
                  fechar e reabrir o app. A movimentação só será autorizada pela
                  decisão do servidor.
                </Text>
              )}
              {saved?.metadata.cacheUsed && (
                <Text>
                  Foi usado o vínculo confirmado anteriormente. A API conferirá
                  novamente sua validade no envio.
                </Text>
              )}
              {saved?.currentDecision && (
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
              <Text selectable>Identificador: {savedId}</Text>
            </VStack>
          </StatusPanel>
        )}
        <TagDetails
          reading={reading}
          capturedAt={pending.current?.occurredAt}
        />
        {!savedId && (
          <Button
            disabled={busy}
            onPress={() => {
              setReading(undefined);
              pending.current = undefined;
              setMessage('');
            }}>
            Ler outra etiqueta antes de confirmar
          </Button>
        )}
        {stored && (
          <Button
            mode="outlined"
            onPress={() =>
              navigation
                .getParent<BottomTabNavigationProp<RotasTab>>()
                ?.navigate('Historico', {reading})
            }>
            Ver histórico desta etiqueta
          </Button>
        )}
        {savedId && (
          <Button
            mode="outlined"
            onPress={() => {
              setType(undefined);
              setReading(undefined);
              setSavedId(undefined);
              setMessage('');
              pending.current = undefined;
            }}>
            Nova captura
          </Button>
        )}
      </VStack>
    </Tela>
  );
}
