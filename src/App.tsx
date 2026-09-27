import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';

import Navigator from './navigation';
import {tema} from './theme';
import Toasts from './components/Base/Toast';
import {SessionProvider} from './components/Auth/SessionProvider';
import {SessionGate} from './components/Auth/SessionGate';

const App = () => (
  <SafeAreaProvider>
    <PaperProvider theme={tema}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={tema.colors.background}
      />
      <SessionProvider>
        <SessionGate>
          <Navigator />
        </SessionGate>
      </SessionProvider>
      <Toasts />
    </PaperProvider>
  </SafeAreaProvider>
);

export default App;
