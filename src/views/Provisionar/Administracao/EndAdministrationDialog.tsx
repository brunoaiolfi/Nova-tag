import React from 'react';
import {ScrollView, StyleSheet, useWindowDimensions} from 'react-native';
import {Dialog, Portal, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import VStack from '../../../components/Base/VStack';
import {ActionButton} from '../../../components/Tracking';
import {palette} from '../../../theme/tokens';

export default function EndAdministrationDialog({
  verified,
  active,
  onDismiss,
  onConfirm,
}: {
  verified: boolean;
  active: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Dialog
        visible
        onDismiss={onDismiss}
        testID="end-administration-dialog"
        style={[
          styles.dialog,
          {
            width: Math.max(
              0,
              Math.min(440, width - insets.left - insets.right - 32),
            ),
            maxHeight: Math.max(0, height - insets.top - insets.bottom - 32),
          },
        ]}>
        <ScrollView
          accessibilityLabel="Confirmação de encerramento"
          style={styles.scroll}
          contentContainerStyle={styles.content}
          bounces={false}>
          <Text accessibilityRole="header" style={styles.title}>
            {verified
              ? 'Finalizar a administração?'
              : 'Encerrar sem configurar?'}
          </Text>
          <Text style={styles.description}>
            {verified
              ? active
                ? 'A configuração e o vínculo ativo serão preservados. Você poderá registrar eventos e consultar o histórico normalmente.'
                : 'A configuração conferida será preservada, mas o vínculo continuará registrado. Você poderá voltar para fazer a leitura de ativação.'
              : 'Nenhum comando de configuração foi emitido. O plano será encerrado e o vínculo continuará registrado. Para configurar depois, encerre o vínculo em Gerenciar e crie uma nova época.'}
          </Text>
          <Text style={styles.note}>
            O plano e o diário permanecerão no histórico.
          </Text>
          <VStack
            gap={8}
            style={styles.actions}
            testID="end-administration-actions">
            <ActionButton mode="contained" onPress={onConfirm}>
              Confirmar encerramento
            </ActionButton>
            <ActionButton onPress={onDismiss}>Voltar ao plano</ActionButton>
          </VStack>
        </ScrollView>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: 'white',
    borderRadius: 24,
    alignSelf: 'center',
    marginHorizontal: 0,
    marginVertical: 16,
  },
  scroll: {flexGrow: 0, flexShrink: 1, minHeight: 0, marginTop: 0},
  content: {padding: 20, gap: 16},
  title: {fontSize: 22, lineHeight: 29, fontWeight: '700', color: palette.navy},
  description: {fontSize: 16, lineHeight: 24, color: palette.navy},
  note: {fontSize: 13, lineHeight: 20, color: palette.muted},
  actions: {alignItems: 'stretch'},
});
