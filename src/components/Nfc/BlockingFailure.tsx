import React from 'react';
import {ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {Dialog, Icon, Portal, Text, TouchableRipple} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ActionButton} from '../Tracking';
import {palette} from '../../theme/tokens';

export function describeFailure(message: string) {
  const match = message.match(/ Código: ([A-Z][A-Z0-9_]{0,63})\.$/);
  const code = match?.[1];
  return {
    code,
    title:
      code === 'NFC_ETIQUETA_EM_USO'
        ? 'Configuração anterior pendente'
        : 'Não foi possível continuar',
    description:
      code === 'NFC_ETIQUETA_EM_USO'
        ? 'Existe uma configuração anterior aberta para esta etiqueta.'
        : message.slice(0, match?.index ?? message.length),
  };
}

/** A blocking failure interrupts the flow and remains visible after the dialog is dismissed. */
export default function BlockingFailure({
  message,
  visible,
  onShow,
  onDismiss,
  actionLabel,
  onAction,
  loading,
  children,
}: {
  message: string;
  visible: boolean;
  onShow: () => void;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const failure = describeFailure(message);
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = height - insets.top - insets.bottom - 32;
  return (
    <>
      <TouchableRipple
        onPress={onShow}
        accessibilityRole="button"
        accessibilityLabel={'Abrir erro: ' + failure.title}
        style={styles.banner}>
        <View
          style={styles.bannerContent}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive">
          <Icon source="alert-circle" size={30} color="white" />
          <View style={styles.grow}>
            <Text style={styles.bannerTitle}>{failure.title}</Text>
            <Text style={styles.bannerDescription}>
              Toque para ver o motivo e resolver.
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color="white" />
        </View>
      </TouchableRipple>
      {visible && (
        <Portal>
          <Dialog
            visible
            dismissable={!loading}
            onDismiss={onDismiss}
            testID="blocking-failure-dialog"
            style={[styles.dialog, {maxHeight: availableHeight}]}>
            <View style={styles.heading}>
              <Icon source="alert-circle" size={30} color="white" />
              <Text accessibilityRole="header" style={styles.title}>
                {failure.title}
              </Text>
            </View>
            <Dialog.ScrollArea style={styles.scrollArea}>
              <ScrollView
                contentContainerStyle={styles.body}
                style={{maxHeight: Math.max(100, availableHeight - 240)}}>
                <Text style={styles.description}>{failure.description}</Text>
                {!!failure.code && (
                  <Text selectable style={styles.code}>
                    {'Código: ' + failure.code + '.'}
                  </Text>
                )}
                {children}
              </ScrollView>
            </Dialog.ScrollArea>
            <View style={styles.actions}>
              <ActionButton
                mode="contained"
                buttonColor={palette.red}
                loading={loading}
                disabled={loading}
                onPress={onAction ?? onDismiss}>
                {actionLabel ?? 'Entendi'}
              </ActionButton>
              {!!onAction && (
                <ActionButton disabled={loading} onPress={onDismiss}>
                  Voltar à tela
                </ActionButton>
              )}
            </View>
          </Dialog>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grow: {flex: 1},
  banner: {backgroundColor: palette.red, borderRadius: 16},
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  bannerTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: 'white',
  },
  bannerDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'white',
    marginTop: 4,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  heading: {
    backgroundColor: palette.red,
    padding: 20,
    gap: 12,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  scrollArea: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    marginBottom: 0,
    minHeight: 0,
  },
  body: {padding: 20, gap: 14},
  description: {fontSize: 16, lineHeight: 24, color: palette.navy},
  code: {fontSize: 12, lineHeight: 18, color: palette.muted},
  actions: {padding: 16, gap: 4},
});
