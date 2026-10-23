import {useHistory} from './use-history';
import {FlatList, StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../components/Tracking';
import React, {useCallback} from 'react';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  List,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import type {RotasTab} from '../../navigation';
import Tela from '../../components/Base/Tela';
import VStack from '../../components/Base/VStack';
import OrderSelect from '../../components/Nfc/OrderSelect';
import Leitor from '../../components/Nfc/Leitor';
import {View} from 'react-native';
import {OrderJourney, PageHero, StatusPanel} from '../../components/Tracking';
import {HistoryItem} from '../../components/Tracking/HistoryTimeline';

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
          data={entries}
          keyExtractor={entry => entry.id}
          contentContainerStyle={contentStyle}
          ListHeaderComponent={
            <VStack gap={16}>
              {header}

              {context?.provisioning && (
                <Text variant="bodySmall">
                  {context.provisioning.status === 'ATIVA'
                    ? 'Etiqueta cadastrada: ativa neste pedido.'
                    : context.provisioning.status === 'REGISTRADA'
                    ? 'Esta etiqueta aguarda ativação e ainda não pode registrar etapas.'
                    : 'O vínculo desta etiqueta foi encerrado. Seu histórico está preservado.'}
                </Text>
              )}
              {context?.provisioning &&
                target?.kind === 'tag' &&
                target.reading.uid !== context.provisioning.uid && (
                  <StatusPanel tone="warning">
                    <Text>
                      A referência NDEF aponta para este vínculo, mas o UID lido
                      é diferente: {target.reading.uid}. Esta consulta não
                      autentica a etiqueta.
                    </Text>
                  </StatusPanel>
                )}
              {target?.kind === 'tag' && (
                <SegmentedButtons
                  value={scope}
                  onValueChange={setScope}
                  buttons={[
                    {value: 'vinculo', label: 'Esta etiqueta', disabled: busy},
                    {value: 'pedido', label: 'Pedido completo', disabled: busy},
                  ]}
                />
              )}
              {context && (
                <VStack gap={8}>
                  <Text variant="titleLarge" style={layoutStyles.sectionTitle}>
                    Caminho do pedido
                  </Text>
                  <Text variant="bodySmall">
                    {scope === 'vinculo'
                      ? `${entries.length} registro(s) deste vínculo carregado(s)`
                      : `${total} registro(s) no pedido`}
                  </Text>
                  {context.provisioning && (
                    <List.Accordion
                      title="Sobre a etiqueta deste pedido"
                      titleNumberOfLines={2}
                      titleStyle={layoutStyles.detailsTitle}>
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
                    </List.Accordion>
                  )}
                </VStack>
              )}
              {busy && (
                <ActivityIndicator accessibilityLabel="Carregando histórico" />
              )}
              {!!message && (
                <>
                  <Text accessibilityRole="alert">{message}</Text>
                  <Button
                    disabled={busy}
                    onPress={() => {
                      if (nextPage !== null) {
                        void more();
                      } else {
                        reload();
                      }
                    }}>
                    Tentar novamente
                  </Button>
                </>
              )}
              {!busy && !message && context && entries.length === 0 && (
                <Text>
                  Nenhum registro encontrado{' '}
                  {scope === 'vinculo' ? 'neste vínculo' : 'neste pedido'}.
                </Text>
              )}
            </VStack>
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
            <VStack gap={16}>
              {nextPage !== null && (
                <Button
                  disabled={busy}
                  onPress={() => {
                    void more();
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
  sectionTitle: {fontWeight: '700'},
  detailsTitle: {fontSize: 15, fontWeight: '600'},
  details: {gap: 10, padding: 12},
});
