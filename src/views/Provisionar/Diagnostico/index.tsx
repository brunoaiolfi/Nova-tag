import React, {useEffect, useRef, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {List, Text} from 'react-native-paper';
import Tela from '../../../components/Base/Tela';
import VStack from '../../../components/Base/VStack';
import {
  ActionButton,
  PageHero,
  StatusPanel,
  trackingColors as colors,
} from '../../../components/Tracking';
import {
  cancelPhysicalRead,
  physicalNfcAvailable,
} from '../../../infra/nfc/reader';
import {
  diagnosePhysicalTag,
  diagnosticJson,
  PhysicalTagReport,
} from '../../../infra/nfc/diagnostics';
import {hex} from '../../../domain/nfc/type4';
import {
  accessDescription,
  writeAccessSummary,
} from '../../../domain/nfc/file-settings';

export default function Diagnostico() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<PhysicalTagReport>();
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (running.current) {
        void cancelPhysicalRead();
      }
    };
  }, []);
  async function read() {
    if (running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const value = await diagnosePhysicalTag();
      if (mounted.current) {
        setReport(value);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Não foi possível ler a etiqueta. Tente novamente.',
        );
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  const version = report?.version.value;
  const file = report?.ndef.file;
  const settings = report?.fileSettings?.value;
  return (
    <Tela
      scroll
      insetTop={false}
      header={
        <PageHero
          fullBleed
          eyebrow="DIAGNÓSTICO NFC"
          icon="nfc-search-variant"
          title="Conheça sua etiqueta."
          description="Consulte o chip e o conteúdo antes de configurar. O resultado permanece aqui até a próxima leitura."
        />
      }
      footer={
        <ActionButton
          mode="contained"
          disabled={busy || !physicalNfcAvailable}
          loading={busy}
          onPress={() => {
            void read();
          }}>
          {report ? 'Diagnosticar outra etiqueta' : 'Diagnosticar etiqueta'}
        </ActionButton>
      }>
      <VStack gap={20}>
        <Text variant="bodyMedium">
          Toque no botão e mantenha a etiqueta próxima à parte superior do
          iPhone até terminar. Esta consulta não grava referências, não muda
          chaves e não ativa vínculos.
        </Text>
        <Text variant="bodyMedium">
          Se a etiqueta tiver SDM configurado, a leitura pode avançar o contador
          do chip. Nenhuma movimentação será registrada.
        </Text>
        {!physicalNfcAvailable && (
          <StatusPanel tone="warning">
            <Text variant="bodyMedium">
              Use o aplicativo de desenvolvimento instalado no celular. O Expo
              Go e o navegador não oferecem acesso NFC.
            </Text>
          </StatusPanel>
        )}
        {busy && (
          <>
            <Text variant="bodyMedium" accessibilityRole="alert">
              Consultando a etiqueta… Aguarde a conclusão antes de afastá-la.
            </Text>
            <ActionButton
              mode="outlined"
              onPress={() => {
                void cancelPhysicalRead();
              }}>
              Cancelar diagnóstico
            </ActionButton>
          </>
        )}
        {!!error && (
          <StatusPanel tone="warning">
            <Text variant="bodyMedium" accessibilityRole="alert">
              {error}
            </Text>
          </StatusPanel>
        )}
        {report && (
          <>
            <View style={styles.identity}>
              <Text variant="labelLarge">NÚMERO LIDO · UID</Text>
              <Text selectable style={styles.uid}>
                {report.uid}
              </Text>
              <Text variant="bodyMedium">
                {new Date(report.capturedAt).toLocaleString('pt-BR')}
              </Text>
              <Text variant="bodyMedium">
                {report.technologies.join(' · ') ||
                  'Tecnologia não informada pelo aparelho'}
              </Text>
            </View>
            <VStack gap={8}>
              <Text variant="titleMedium">Compatibilidade com os ensaios</Text>
              <StatusPanel
                tone={version?.compatibleNtag424 ? 'success' : 'warning'}>
                <Text variant="titleMedium">
                  {version?.compatibleNtag424
                    ? 'Versão compatível com NTAG 424 DNA'
                    : 'NTAG 424 DNA não confirmada'}
                </Text>
                <Text>
                  {version?.compatibleNtag424
                    ? 'O chip declarou uma versão compatível. GET_VERSION não comprova originalidade nem que o SDM esteja configurado.'
                    : 'Não use este resultado como aceite de SDM. Uma etiqueta como a Feiju pode servir para os testes de UID e NDEF estático, sujeitos à leitura e à capacidade disponíveis.'}
                </Text>
                {!!report.version.issue && <Text>{report.version.issue}</Text>}
              </StatusPanel>
              {version && (
                <Text>
                  {report.uidMatchesProduction
                    ? 'O UID lido coincide com o UID de produção. Repita a leitura após afastar a etiqueta para verificar a estabilidade.'
                    : 'O UID de produção está oculto ou diverge do UID lido. Não considere o UID estável para o tratamento UID sem verificar a configuração.'}
                </Text>
              )}
            </VStack>
            <VStack gap={8}>
              <Text variant="titleMedium">Permissões declaradas pelo chip</Text>
              {settings ? (
                <>
                  <Text>{writeAccessSummary(settings.accessRights)}</Text>
                  <Text>
                    Leitura: {accessDescription(settings.accessRights.read)}.
                    Leitura e escrita:{' '}
                    {accessDescription(settings.accessRights.readWrite)}.
                  </Text>
                  <Text>
                    Escrita: {accessDescription(settings.accessRights.write)}.
                    Alteração das permissões:{' '}
                    {accessDescription(settings.accessRights.change)}.
                  </Text>
                  <Text>
                    {settings.sdm
                      ? 'SDM declarado como habilitado.'
                      : 'SDM declarado como desabilitado.'}{' '}
                    Isso não verifica a mensagem, as chaves nem a proteção
                    efetiva.
                  </Text>
                </>
              ) : (
                <Text>
                  {report.fileSettings?.issue ||
                    'Permissões nativas não disponíveis.'}
                </Text>
              )}
              <Text>
                A proteção precisa ser confirmada em bancada com escrita sem
                autorização negada e reconfiguração autorizada possível.
              </Text>
            </VStack>
            <VStack gap={8}>
              <Text variant="titleMedium">Conteúdo NDEF</Text>
              {file && (
                <Text>
                  Capacidade declarada: {file.maximumFileSize - 2} bytes de
                  mensagem.
                  {report.ndef.bytes !== undefined
                    ? ` Lidos: ${report.ndef.bytes.length} bytes.`
                    : ''}
                </Text>
              )}
              {file && (
                <Text>
                  {file.writeAccess === 0
                    ? 'O arquivo de capacidade declara escrita livre.'
                    : file.writeAccess === 255
                    ? 'O arquivo de capacidade declara escrita bloqueada.'
                    : 'O arquivo de capacidade declara uma condição de escrita restrita ou reservada.'}{' '}
                  Isso não comprova a proteção por chave do ensaio.
                </Text>
              )}
              {report.reference ? (
                <Text selectable>{report.reference}</Text>
              ) : report.ndef.bytes?.length === 0 ? (
                <Text>A mensagem NDEF está vazia.</Text>
              ) : (
                <Text>Nenhuma referência URI/Text foi identificada.</Text>
              )}
              {!!report.ndef.issue && <Text>{report.ndef.issue}</Text>}
              {!!report.ndefDecodeIssue && (
                <Text>{report.ndefDecodeIssue}</Text>
              )}
            </VStack>
            <ActionButton
              mode="outlined"
              icon="share-variant"
              disabled={busy}
              onPress={() => {
                void Share.share({
                  title: 'Diagnóstico NFC Nova-tag',
                  message: diagnosticJson(report),
                }).catch(() => {
                  if (mounted.current) {
                    setError('Não foi possível compartilhar. Tente novamente.');
                  }
                });
              }}>
              Compartilhar diagnóstico
            </ActionButton>
            <Text style={styles.note}>
              O relatório contém UID, conteúdo NDEF, comandos de consulta e
              versão do aplicativo. Compartilhe somente com as pessoas do
              projeto.
            </Text>
            <List.Accordion
              title="Dados técnicos da consulta"
              titleNumberOfLines={2}
              expanded={expanded}
              onPress={() => setExpanded(!expanded)}>
              <VStack gap={12}>
                <Text>
                  {report.device.platform} {report.device.osVersion} · app{' '}
                  {report.device.appVersion} · build {report.device.nativeBuild}
                </Text>
                {version && (
                  <Text selectable style={styles.monospace}>
                    GET_VERSION HW: {version.hardwareHex}
                    {'\n'}SW: {version.softwareHex}
                    {'\n'}Produção: {version.productionHex}
                  </Text>
                )}
                {settings && (
                  <Text selectable style={styles.monospace}>
                    GetFileSettings arquivo 02: {settings.rawHex}
                    {'\n'}Capacidade: {settings.fileSize} bytes · comunicação{' '}
                    {settings.communication}
                    {'\n'}
                    {settings.sdm
                      ? JSON.stringify(settings.sdm, null, 2)
                      : 'Sem campos SDM.'}
                  </Text>
                )}
                {report.ndef.bytes !== undefined && (
                  <Text selectable style={styles.monospace}>
                    Mensagem NDEF original (hex):{' '}
                    {hex(report.ndef.bytes) || '(vazia)'}
                  </Text>
                )}
                {report.exchanges.map((exchange, index) => (
                  <Text selectable key={index} style={styles.monospace}>
                    {index + 1}. {exchange.commandHex}
                    {'\n'}→ {exchange.responseHex}
                  </Text>
                ))}
              </VStack>
            </List.Accordion>
          </>
        )}
      </VStack>
    </Tela>
  );
}

const styles = StyleSheet.create({
  identity: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.pale,
    gap: 8,
  },
  uid: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    fontFamily: 'monospace',
  },
  monospace: {fontFamily: 'monospace', fontSize: 13, lineHeight: 20},
  note: {color: colors.muted, lineHeight: 22},
});
