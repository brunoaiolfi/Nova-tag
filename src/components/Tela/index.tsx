import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, useTheme} from 'react-native-paper';

type TelaProps = {
  titulo: string;
};

const Tela = ({titulo}: TelaProps) => {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text variant="headlineMedium">{titulo}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Tela;
