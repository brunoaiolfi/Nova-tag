import React, {useState} from 'react';
import {ActivityIndicator, Divider, List, Text} from 'react-native-paper';
import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import {
  ActionButton as Button,
  PageHero,
  StatusPanel,
} from '../../components/Tracking';
import {useOffline} from '../../components/Offline/OfflineProvider';
import {useSession} from '../../components/Auth/SessionProvider';
import Leitor from '../../components/Nfc/Leitor';
import type {QueuedCapture} from '../../domain/offline/types';
import {
  descricaoEnumTipoEvento,
  EnumTipoEvento,
} from '../../domain/enums/tipoEvento';
import {reasonLabel} from '../traceability-labels';
import {SdmEvidence} from '../../components/Tracking/SdmEvidence';
import {decisionStatus} from '../../domain/traceability/decision-status';
import {DecisionDetails} from '../../components/Tracking/DecisionDetails';

export function captureStatus(item: QueuedCapture) {
  if (item.state === 'STORED')
    return item.businessState === 'ACCEPTED'
      ? 'Operação aceita'
      : item.businessState === 'PENDING'
      ? 'Salva no servidor · aguardando etapa anterior'
      : item.currentDecision &&
        decisionStatus(item.currentDecision.decisao) === 'TARDIA'
      ? 'Leitura tardia preservada · sem movimentação'
      : 'Operação rejeitada · pedido não alterado';
  return {
    QUEUED: 'Salva neste aparelho · aguardando envio',
    SENDING: 'Enviando · registro preservado',
    RETRY: 'Aguardando nova tentativa',
    AUTH_REQUIRED: 'Entre novamente com o operador original',
    CONFLICT: 'Conflito · registro original preservado',
    FAILED: 'Envio não aceito · confira o motivo',
  }[item.state];
}
export default function Envios() {
  const queue = useOffline();
  const {manager, state} = useSession();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = queue.items.filter(
    item => !['STORED', 'CONFLICT', 'FAILED'].includes(item.state),
  );
  const logistics = queue.items.filter(
    item => item.state === 'STORED' && item.businessState === 'PENDING',
  );
  async function synchronize() {
    setBusy(true);
    setMessage('');
    try {
      if (state.status !== 'authenticated') await manager.restore();
      await queue.manager.synchronize(true);
      await queue.manager.refreshDecisions();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (scanning)
    return (
      <Leitor
        context="Disponibilizar etiqueta para uso offline"
        onVoltar={() => setScanning(false)}
        onErroLeitura={setMessage}
        onLeituraRealizada={async reading => {
          setScanning(false);
          setBusy(true);
          try {
            const p = await queue.manager.remember(reading);
            setMessage(
              'Etiqueta disponível offline por até 24 horas. Vínculo ativo · época ' +
                p.epoca +
                '.',
            );
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  return (
    <Tela
      scroll
      header={
        <PageHero
          fullBleed
          title="Capturas e envios"
          eyebrow="SEU APARELHO"
          icon="cloud-upload-outline"
          description="Acompanhe o que foi salvo aqui e a decisão de cada operação."
        />
      }
      footer={
        <Button
          mode="contained"
          loading={busy || queue.syncing}
          disabled={
            busy ||
            queue.syncing ||
            !!queue.error ||
            state.session?.user.perfil === 'CONSULTA'
          }
          onPress={() => {
            void synchronize();
          }}>
          Sincronizar agora
        </Button>
      }>
      <VStack gap={18}>
        <StatusPanel tone={state.status === 'offline' ? 'warning' : 'info'}>
          <Text variant="titleMedium">
            {state.status === 'offline'
              ? 'Você está em modo offline'
              : 'Fila deste operador'}
          </Text>
          <Text>
            {pending.length}{' '}
            {pending.length === 1
              ? 'captura aguardando confirmação'
              : 'capturas aguardando confirmação'}{' '}
            do servidor.
          </Text>
          <Text>
            Salvar no aparelho não autoriza a movimentação. Confira a decisão
            após o envio.
          </Text>
          {!!logistics.length && (
            <Text>
              {logistics.length}{' '}
              {logistics.length === 1
                ? 'operação salva no servidor aguarda'
                : 'operações salvas no servidor aguardam'}{' '}
              uma etapa anterior. A decisão é atualizada automaticamente
              enquanto o app está aberto e conectado.
            </Text>
          )}
        </StatusPanel>
        {!!queue.error && <Text accessibilityRole="alert">{queue.error}</Text>}
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {queue.loading && (
          <ActivityIndicator accessibilityLabel="Abrindo capturas salvas" />
        )}
        <Button
          mode="outlined"
          disabled={
            busy ||
            !!queue.error ||
            state.status !== 'authenticated' ||
            state.session?.user.perfil === 'CONSULTA'
          }
          onPress={() => {
            setMessage('');
            setScanning(true);
          }}>
          Disponibilizar etiqueta para offline
        </Button>
        <Text>
          Faça isso com conexão antes da coleta. Somente vínculos ativos já
          confirmados ficam disponíveis; a configuração de etiquetas continua
          online.
        </Text>
        {!queue.items.length && !queue.loading && (
          <Text>
            Nenhuma captura salva para este operador nesta API. Capturas de
            outras contas permanecem guardadas para o operador original.
          </Text>
        )}
        {queue.items.map(item => (
          <VStack key={item.id} gap={8}>
            <Text variant="titleMedium">
              {descricaoEnumTipoEvento[item.payload.tipo as EnumTipoEvento] ??
                item.payload.tipo}{' '}
              · {item.payload.leituraBruta.uid}
            </Text>
            <Text>
              {new Date(item.payload.ocorridoEm).toLocaleString('pt-BR')}
            </Text>
            <Text accessibilityRole="alert">{captureStatus(item)}</Text>
            {item.currentDecision && (
              <Text>{reasonLabel(item.currentDecision.decisao.motivo)}</Text>
            )}
            <SdmEvidence sdm={item.currentDecision?.decisao.sdm} />
            {item.currentDecision && (
              <DecisionDetails
                decision={item.currentDecision.decisao}
                history={item.currentDecision.historicoDecisoes}
              />
            )}
            {!!item.message && <Text>{item.message}</Text>}
            <List.Accordion title="Comprovante e vínculo original">
              <Text selectable>Identificador: {item.id}</Text>
              <Text>Época: {item.metadata.provisioning.epoca}</Text>
              <Text selectable>Vínculo: {item.payload.provisionamentoId}</Text>
              <Text>
                {item.metadata.cacheUsed
                  ? 'Vínculo obtido da confirmação local anterior.'
                  : 'Vínculo consultado na API durante a confirmação.'}
              </Text>
              <Text>Envios tentados: {item.attempts}</Text>
              {item.receipt && (
                <Text>
                  Decisão no comprovante original:{' '}
                  {reasonLabel(item.receipt.decisao.motivo)}. Reenvios mantêm
                  este comprovante.
                </Text>
              )}
              {!!item.errorCode && <Text>Código: {item.errorCode}</Text>}
            </List.Accordion>
            <Divider />
          </VStack>
        ))}
      </VStack>
    </Tela>
  );
}
