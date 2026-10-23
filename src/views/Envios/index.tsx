import {captureStatus} from '../../components/Tracking/capture-status';
import React, {useState} from 'react';
import {FlatList} from 'react-native';
import {ActivityIndicator, Divider, List, Text} from 'react-native-paper';
import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import {
  ActionButton as Button,
  Details,
  PageHero,
  StatusPanel,
} from '../../components/Tracking';
import {useOffline} from '../../components/Offline/OfflineProvider';
import {useSession} from '../../components/Auth/SessionProvider';
import Leitor from '../../components/Nfc/Leitor';
import {
  descricaoEnumTipoEvento,
  EnumTipoEvento,
} from '../../domain/enums/tipoEvento';
import {reasonLabel} from '../../components/Tracking/labels';
import {SdmEvidence} from '../../components/Tracking/SdmEvidence';
import {DecisionDetails} from '../../components/Tracking/DecisionDetails';
import {ExperimentPanel} from '../../components/Offline/ExperimentPanel';

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
      await queue.manager.experiment?.flush();
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
        backLabel="Voltar aos envios"
        onErroLeitura={setMessage}
        onLeituraRealizada={async reading => {
          setScanning(false);
          setBusy(true);
          try {
            const cachedProvisioning = await queue.manager.remember(reading);
            setMessage(
              'Etiqueta disponível offline por até 24 horas. Vínculo ativo · época ' +
                cachedProvisioning.epoca +
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
      header={
        <PageHero
          fullBleed
          title="Capturas e envios"
          icon="cloud-upload-outline"
          description="Confira o envio e a decisão das etapas."
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
          Sincronizar
        </Button>
      }
      renderContent={({header, contentStyle}) => (
        <FlatList
          data={queue.items}
          keyExtractor={item => item.id}
          contentContainerStyle={contentStyle}
          ListHeaderComponent={
            <VStack gap={16}>
              {header}
              <StatusPanel
                tone={state.status === 'offline' ? 'warning' : 'info'}>
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
                <Text>A etapa só avança após a autorização do servidor.</Text>
                {!!logistics.length && (
                  <Text>
                    {logistics.length}{' '}
                    {logistics.length === 1
                      ? 'operação salva no servidor aguarda'
                      : 'operações salvas no servidor aguardam'}{' '}
                    uma etapa anterior.
                  </Text>
                )}
              </StatusPanel>
              {!!queue.error && (
                <Text accessibilityRole="alert">{queue.error}</Text>
              )}
              {!!message && <Text accessibilityRole="alert">{message}</Text>}
              {queue.loading && (
                <ActivityIndicator accessibilityLabel="Abrindo capturas salvas" />
              )}
              <Details title="Preparar uso offline">
                <Text>
                  Leia com conexão antes de sair. O vínculo fica disponível por
                  até 24 horas.
                </Text>
                <Button
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
                  Preparar etiqueta
                </Button>
              </Details>
              {!queue.items.length && !queue.loading && (
                <Text>
                  Nenhuma captura salva para este operador nesta API. Capturas
                  de outras contas permanecem guardadas para o operador
                  original.
                </Text>
              )}
            </VStack>
          }
          renderItem={({item}) => (
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
              {item.currentDecision && item.businessState !== 'ACCEPTED' && (
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
                <Text selectable>
                  Vínculo: {item.payload.provisionamentoId}
                </Text>
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
          )}
          ListFooterComponent={
            <VStack gap={16}>
              <ExperimentPanel />
            </VStack>
          }
        />
      )}
    />
  );
}
