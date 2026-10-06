import React from 'react';
import {StatusBar, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Navigator from './navigation';
import {tema} from './theme';
import Toasts from './components/Base/Toast';
import {SessionProvider} from './components/Auth/SessionProvider';
import {SessionGate} from './components/Auth/SessionGate';
import {OfflineProvider} from './components/Offline/OfflineProvider';

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
            <OfflineProvider>
              <SessionGate>
                <Navigator />
              </SessionGate>
            </OfflineProvider>
          </SessionProvider>
        </View>
      </View>
      <Toasts />
    </PaperProvider>
  </SafeAreaProvider>
);

export default App;
const styles = StyleSheet.create({
  root: {flex: 1, minHeight: 0},
  content: {flex: 1, minHeight: 0},
});
