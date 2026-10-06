import React from 'react';
import {ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAppTheme} from '../../../theme';

type TelaProps = {
  children?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  /** Native stack headers already include the top safe area. */
  insetTop?: boolean;
};

const Tela = ({
  children,
  scroll,
  footer,
  header,
  insetTop = true,
}: TelaProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.conteudo,
    {paddingBottom: 16 + (footer ? 0 : insets.bottom)},
  ];
  const body = (
    <View style={[contentStyle, !!header && styles.sheet]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={insetTop ? ['top'] : []}
      style={[
        styles.tela,
        {
          backgroundColor: header
            ? theme.colors.primary
            : theme.colors.background,
        },
      ]}>
      <StatusBar
        barStyle={header ? 'light-content' : 'dark-content'}
        backgroundColor={
          header ? theme.colors.primary : theme.colors.background
        }
      />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {header}
          {body}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>
          {header}
          {body}
        </View>
      )}
      {footer && (
        <View style={[styles.footer, {paddingBottom: 16 + insets.bottom}]}>
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {flex: 1, minHeight: 0},
  scrollContent: {flexGrow: 1},
  conteudo: {
    flexGrow: 1,
    padding: 20,
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
  },
  footer: {
    flexShrink: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E3E7F2',
  },
});

export default Tela;
