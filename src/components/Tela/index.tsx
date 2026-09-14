import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppTheme} from '../../theme';

type TelaProps = {
  children?: React.ReactNode;
  scroll?: boolean;
};

const Tela = ({children, scroll}: TelaProps) => {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.tela, {backgroundColor: theme.colors.background}]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.conteudo}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.conteudo}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tela: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    padding: 16,
  },
});

export default Tela;
