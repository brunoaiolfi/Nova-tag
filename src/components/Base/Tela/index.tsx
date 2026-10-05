import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAppTheme} from '../../../theme';

type TelaProps = {
  children?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
};

const Tela = ({children, scroll, footer}: TelaProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.conteudo,
    {paddingBottom: 16 + (footer ? 0 : insets.bottom)},
  ];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.tela, {backgroundColor: theme.colors.background}]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
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
  conteudo: {
    flexGrow: 1,
    padding: 16,
  },
  footer: {
    flexShrink: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#D6E1EB',
  },
});

export default Tela;
