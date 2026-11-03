import type {Reading} from '../../domain/traceability/reading';
import {showCommandFailure} from '../../components/Base/Toast/service';
import {captureStatus} from '../../components/Tracking/capture-status';
import React, {useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {ActivityIndicator, Icon, List, Text} from 'react-native-paper';
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
import {reasonLabel, eventLabel} from '../../components/Tracking/labels';
import {SdmEvidence} from '../../components/Tracking/SdmEvidence';
import {DecisionDetails} from '../../components/Tracking/DecisionDetails';
import {ExperimentPanel} from '../../components/Offline/ExperimentPanel';
import {palette} from '../../theme/tokens';

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
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remember(reading: Reading) {
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
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível disponibilizar a etiqueta.',
      );
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
        onLeituraRealizada={reading => {
          remember(reading).catch(showCommandFailure);
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
          icon="sync"
          loading={busy || queue.syncing}
          disabled={
            busy ||
            queue.syncing ||
            !!queue.error ||
            state.session?.user.perfil === 'CONSULTA'
          }
          onPress={() => {
            synchronize().catch(showCommandFailure);
          }}>
          Sincronizar
        </Button>
      }
      renderContent={({header, contentStyle}) => (
        <FlatList
          testID="outbox-list"
          style={styles.list}
          data={queue.items}
          keyExtractor={item => item.id}
          contentContainerStyle={[contentStyle, styles.listContent]}
          ListHeaderComponent={
            <View>
              {header}
              <VStack gap={16} style={styles.sheet}>
                <View style={styles.sectionHeading}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Suas capturas
                  </Text>
                  {!!queue.items.length && (
                    <Text style={styles.count}>
                      {queue.items.length} salvas
                    </Text>
                  )}
                </View>
                {(!!queue.items.length || state.status === 'offline') && (
                  <StatusPanel
                    tone={state.status === 'offline' ? 'warning' : 'info'}>
                    <Text variant="titleMedium">
                      {state.status === 'offline'
                        ? 'Você está em modo offline'
                        : 'Acompanhamento do envio'}
                    </Text>
                    <Text>
                      {pending.length}{' '}
                      {pending.length === 1
                        ? 'captura aguardando confirmação'
                        : 'capturas aguardando confirmação'}{' '}
                      do servidor.
                    </Text>
                    <Text>
                      A etapa só avança após a autorização do servidor.
                    </Text>
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
                )}
                {!!queue.error && (
                  <StatusPanel tone="error">
                    <Text accessibilityRole="alert">{queue.error}</Text>
                  </StatusPanel>
                )}
                {!!message && (
                  <StatusPanel>
                    <Text accessibilityRole="alert">{message}</Text>
                  </StatusPanel>
                )}
                {queue.loading && (
                  <VStack gap={12} align="center" style={styles.loading}>
                    <ActivityIndicator accessibilityLabel="Abrindo capturas salvas" />
                    <Text style={styles.description}>
                      Carregando suas capturas…
                    </Text>
                  </VStack>
                )}
                {!queue.items.length && !queue.loading && !queue.error && (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Icon
                        source="cloud-check-outline"
                        size={32}
                        color={palette.blue}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>
                      Nenhuma captura por aqui
                    </Text>
                    <Text style={styles.emptyDescription}>
                      Registre uma etapa para acompanhar o envio e a
                      confirmação.
                    </Text>
                    <Text style={styles.accountNote}>
                      Cada conta acompanha suas próprias capturas.
                    </Text>
                  </View>
                )}
              </VStack>
            </View>
          }
          renderItem={({item}) => (
            <VStack gap={8} style={styles.captureCard}>
              <Text variant="titleMedium">
                {eventLabel(item.payload.tipo)} ·{' '}
                {item.payload.leituraBruta.uid}
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
              <List.Accordion
                title="Comprovante e vínculo original"
                style={styles.receipt}>
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
            </VStack>
          )}
          ListFooterComponent={
            <VStack gap={12} style={styles.tools}>
              <Details
                title="Preparar uso offline"
                description="Deixe a etiqueta pronta antes de sair."
                icon="cloud-outline"
                variant="card">
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
              <ExperimentPanel />
            </VStack>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {backgroundColor: 'white'},
  listContent: {paddingHorizontal: 0, paddingTop: 0},
  sheet: {
    padding: 16,
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: palette.navy,
  },
  count: {fontSize: 13, lineHeight: 20, color: palette.muted},
  loading: {paddingVertical: 28},
  description: {color: palette.muted},
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.pale,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: palette.navy,
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 290,
    color: palette.muted,
  },
  accountNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: palette.muted,
    marginTop: 4,
  },
  captureCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: 'white',
  },
  receipt: {backgroundColor: 'white'},
  tools: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12},
});
