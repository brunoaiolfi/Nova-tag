import React from 'react';
import {StatusBar, View, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {PaperProvider, Text} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Navigator from './navigation';
import {tema} from './theme';
import Toasts from './components/Base/Toast';
import {SessionProvider} from './components/Auth/SessionProvider';
import {SessionGate} from './components/Auth/SessionGate';

const settings = {
  icon: (props: {name: string; size: number; color?: string}) => (
    <MaterialCommunityIcons
      {...props}
      name={
        props.name as React.ComponentProps<
          typeof MaterialCommunityIcons
        >['name']
      }
    />
  ),
};
const App = () => (
  <SafeAreaProvider>
    <PaperProvider theme={tema} settings={settings}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={tema.colors.background}
      />
      <View style={styles.root}>
        <View style={styles.content}>
          <SessionProvider>
            <SessionGate>
              <Navigator />
            </SessionGate>
          </SessionProvider>
        </View>
        <SafeAreaView edges={['bottom']} style={styles.noticeBackground}>
          <Text style={styles.notice}>
            Laboratório · NFC físico requer o aplicativo Nova-tag NFC
          </Text>
        </SafeAreaView>
      </View>
      <Toasts />
    </PaperProvider>
  </SafeAreaProvider>
);

export default App;
const styles = StyleSheet.create({
  root: {flex: 1, minHeight: 0},
  content: {flex: 1, minHeight: 0},
  noticeBackground: {backgroundColor: '#fff3cd'},
  notice: {
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#fff3cd',
    paddingBottom: 16,
  },
});
