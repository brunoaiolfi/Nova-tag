import {showCommandFailure} from '../../components/Base/Toast/service';
import {useHistory} from './use-history';
import {FlatList, StyleSheet, View} from 'react-native';
import {ActionButton as Button} from '../../components/Tracking';
import React, {useCallback} from 'react';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Icon,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import type {RotasTab} from '../../navigation';
import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import OrderSelect from '../../components/Nfc/OrderSelect';
import Leitor from '../../components/Nfc/Leitor';
import {
  Details,
  OrderJourney,
  PageHero,
  StatusPanel,
} from '../../components/Tracking';
import {HistoryItem} from '../../components/Tracking/HistoryTimeline';
import {palette} from '../../theme/tokens';

export {HistoryItem} from '../../components/Tracking/HistoryTimeline';

export default function Historico() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RotasTab, 'Historico'>>();
  const params = useRoute<RouteProp<RotasTab, 'Historico'>>().params;
  const consumeRouteReading = useCallback(
    () => navigation.setParams({reading: undefined}),
    [navigation],
  );
  const {
    target,
    context,
    entries,
    scope,
    scanning,
    busy,
    message,
    nextPage,
    total,
    choose,
    setScope,
    setScanning,
    reload,
    more,
    auth: state,
  } = useHistory(params?.reading, consumeRouteReading);

  if (scanning) {
    return (
      <Leitor
        context="Consultar histórico · sem gravar na etiqueta"
        continueLabel="Ver histórico desta etiqueta"
        onVoltar={() => setScanning(false)}
        backLabel="Voltar ao histórico"
        onErroLeitura={() => {}}
        onLeituraRealizada={reading => {
          choose({kind: 'tag', reading});
          setScanning(false);
        }}
      />
    );
  }
  if (!target)
    return (
      <OrderSelect
        purpose="history"
        disabled={false}
        onSelect={selectedOrder =>
          selectedOrder && choose({kind: 'order', order: selectedOrder})
        }
        pickerHeader={
          <Button
            mode="contained"
            icon="nfc-search-variant"
            onPress={() => setScanning(true)}>
            Ler etiqueta
          </Button>
        }
      />
    );
  return (
    <Tela
      header={
        context ? (
          <OrderJourney order={context.order} fullBleed />
        ) : (
          <PageHero
            fullBleed
            title="Rastrear pedido"
            description="Leia a etiqueta ou busque pelo código."
            icon="map-marker-path"
          />
        )
      }
      renderContent={({header, contentStyle}) => (
        <FlatList
          testID="history-list"
          style={layoutStyles.list}
          data={entries}
          keyExtractor={entry => entry.id}
          contentContainerStyle={[contentStyle, layoutStyles.listContent]}
          ListHeaderComponent={
            <View>
              {header}
              <VStack
                gap={16}
                style={layoutStyles.sheet}
                testID="history-content">
                {context?.provisioning && (
                  <StatusPanel
                    tone={
                      context.provisioning.status === 'REGISTRADA'
                        ? 'warning'
                        : 'info'
                    }>
                    <Text style={layoutStyles.notice}>
                      {context.provisioning.status === 'ATIVA'
                        ? 'Etiqueta cadastrada: ativa neste pedido.'
                        : context.provisioning.status === 'REGISTRADA'
                        ? 'Esta etiqueta aguarda ativação e ainda não pode registrar etapas.'
                        : 'O vínculo desta etiqueta foi encerrado. Seu histórico está preservado.'}
                    </Text>
                  </StatusPanel>
                )}
                {context?.provisioning &&
                  target?.kind === 'tag' &&
                  target.reading.uid !== context.provisioning.uid && (
                    <StatusPanel tone="warning">
                      <Text style={layoutStyles.notice}>
                        A referência NDEF aponta para este vínculo, mas o UID
                        lido é diferente: {target.reading.uid}. Esta consulta
                        não autentica a etiqueta.
                      </Text>
                    </StatusPanel>
                  )}
                {target?.kind === 'tag' && (
                  <SegmentedButtons
                    value={scope}
                    onValueChange={setScope}
                    theme={{
                      colors: {
                        secondaryContainer: palette.pale,
                        outline: palette.line,
                      },
                    }}
                    buttons={[
                      {
                        value: 'vinculo',
                        label: 'Esta etiqueta',
                        disabled: busy,
                        checkedColor: palette.blue,
                        uncheckedColor: palette.muted,
                        style: layoutStyles.segment,
                        labelStyle: layoutStyles.segmentLabel,
                      },
                      {
                        value: 'pedido',
                        label: 'Pedido completo',
                        disabled: busy,
                        checkedColor: palette.blue,
                        uncheckedColor: palette.muted,
                        style: layoutStyles.segment,
                        labelStyle: layoutStyles.segmentLabel,
                      },
                    ]}
                  />
                )}
                {context && (
                  <VStack gap={8}>
                    <Text
                      accessibilityRole="header"
                      variant="titleLarge"
                      style={layoutStyles.sectionTitle}>
                      Caminho do pedido
                    </Text>
                    <Text style={layoutStyles.count}>
                      {scope === 'vinculo'
                        ? `${entries.length} ${
                            entries.length === 1
                              ? 'registro carregado'
                              : 'registros carregados'
                          } desta etiqueta`
                        : `${total} ${
                            total === 1 ? 'registro' : 'registros'
                          } no pedido`}
                    </Text>
                    {context.provisioning && (
                      <Details
                        title="Sobre a etiqueta deste pedido"
                        description="Identificação e situação do vínculo"
                        icon="nfc-variant"
                        variant="card">
                        <View style={layoutStyles.details}>
                          <Text selectable>
                            Etiqueta cadastrada: {context.provisioning.uid}
                          </Text>
                          <Text>
                            Vínculo{' '}
                            {context.provisioning.epoca
                              ? `· época ${context.provisioning.epoca}`
                              : ''}
                            :{' '}
                            {context.provisioning.status === 'ATIVA'
                              ? 'Ativo'
                              : context.provisioning.status === 'REGISTRADA'
                              ? 'Aguardando ativação'
                              : 'Encerrado'}
                          </Text>
                          <Text>
                            Identificação por{' '}
                            {context.provisioning.estrategia === 'UID'
                              ? 'UID'
                              : context.provisioning.estrategia === 'SDM'
                              ? 'SDM (validação no servidor)'
                              : 'referência NDEF'}
                            .
                          </Text>
                          {state.session?.user.perfil === 'ADMINISTRADOR' && (
                            <Button
                              disabled={busy}
                              onPress={() =>
                                navigation.navigate('Provisionar', {
                                  screen: 'Gerenciar',
                                  params: {
                                    provisioningId: context.provisioning?.id,
                                  },
                                })
                              }>
                              Gerenciar vínculo
                            </Button>
                          )}
                        </View>
                      </Details>
                    )}
                  </VStack>
                )}
                {busy && (
                  <VStack gap={8} style={layoutStyles.loading}>
                    <ActivityIndicator
                      color={palette.blue}
                      accessibilityLabel="Carregando histórico"
                    />
                    <Text style={layoutStyles.loadingText}>
                      Consultando registros…
                    </Text>
                  </VStack>
                )}
                {!!message && (
                  <StatusPanel tone="error">
                    <Text accessibilityRole="alert" style={layoutStyles.notice}>
                      {message}
                    </Text>
                    <Button
                      disabled={busy}
                      onPress={() => {
                        if (nextPage !== null) {
                          more().catch(showCommandFailure);
                        } else {
                          reload();
                        }
                      }}>
                      Tentar novamente
                    </Button>
                  </StatusPanel>
                )}
                {!busy && !message && context && entries.length === 0 && (
                  <VStack gap={10} style={layoutStyles.emptyState}>
                    <View style={layoutStyles.emptyIcon}>
                      <Icon
                        source="map-marker-path"
                        size={30}
                        color={palette.blue}
                      />
                    </View>
                    <Text style={layoutStyles.emptyTitle}>
                      Nenhuma etapa registrada
                    </Text>
                    <Text style={layoutStyles.emptyDescription}>
                      Nenhum registro encontrado{' '}
                      {scope === 'vinculo' ? 'neste vínculo' : 'neste pedido'}.
                    </Text>
                  </VStack>
                )}
              </VStack>
            </View>
          }
          renderItem={({item: entry, index}) => (
            <HistoryItem
              entry={entry}
              isLast={index === entries.length - 1 && nextPage === null}
              anotherLink={
                !!context?.provisioning &&
                entry.provisionamentoId !== context.provisioning.id
              }
            />
          )}
          ListFooterComponent={
            <VStack gap={16} style={layoutStyles.tools}>
              {nextPage !== null && (
                <Button
                  disabled={busy}
                  onPress={() => {
                    more().catch(showCommandFailure);
                  }}>
                  Carregar mais registros
                </Button>
              )}
              {target && (
                <VStack gap={8}>
                  <Button icon="refresh" disabled={busy} onPress={reload}>
                    Atualizar
                  </Button>
                  <Button
                    icon="magnify"
                    disabled={busy}
                    onPress={() => choose()}>
                    Outro pedido
                  </Button>
                  <Button
                    icon="nfc-search-variant"
                    onPress={() => setScanning(true)}>
                    Ler outra etiqueta
                  </Button>
                </VStack>
              )}
            </VStack>
          }
        />
      )}
    />
  );
}

const layoutStyles = StyleSheet.create({
  list: {backgroundColor: 'white'},
  listContent: {paddingHorizontal: 0, paddingTop: 0},
  sheet: {
    padding: 16,
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: palette.navy,
  },
  count: {fontSize: 13, lineHeight: 20, color: palette.muted},
  notice: {fontSize: 14, lineHeight: 22, color: palette.navy},
  segment: {minHeight: 48},
  segmentLabel: {fontSize: 13, lineHeight: 20},
  details: {gap: 10},
  loading: {paddingVertical: 24},
  loadingText: {color: palette.muted, textAlign: 'center'},
  emptyState: {alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8},
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: palette.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.navy,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: palette.muted,
    textAlign: 'center',
    maxWidth: 290,
  },
  tools: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12},
});
