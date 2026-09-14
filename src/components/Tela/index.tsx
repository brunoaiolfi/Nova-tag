import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../../theme';

type TelaProps = {
  children: React.ReactNode;
};

const Tela = ({children}: TelaProps) => {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {children}
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
