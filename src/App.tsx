import React, {useState} from 'react';
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
import {AppServicesProvider} from './components/Services/AppServicesProvider';
import {createAppServices} from './bootstrap/create-app-services';
import type {AppServices} from './appplication/ports/app-services';

function isIconName(
  name: string,
): name is keyof typeof MaterialCommunityIcons.glyphMap {
  return Object.prototype.hasOwnProperty.call(
    MaterialCommunityIcons.glyphMap,
    name,
  );
}
const settings = {
  icon: (props: {name: string; size: number; color?: string}) => (
    <MaterialCommunityIcons
      {...props}
      name={isIconName(props.name) ? props.name : 'help-circle-outline'}
    />
  ),
};
const App = ({services: provided}: {services?: AppServices}) => {
  const [services] = useState(() => provided ?? createAppServices());
  return (
    <AppServicesProvider services={services}>
      <SafeAreaProvider>
        <PaperProvider theme={tema} settings={settings}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={tema.colors.background}
          />
          <View style={styles.root}>
            <View style={styles.content}>
              <SessionProvider manager={services.session}>
                <OfflineProvider
                  manager={services.offline}
                  session={services.session}
                  connectivity={services.connectivity}>
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
    </AppServicesProvider>
  );
};

export default App;
const styles = StyleSheet.create({
  root: {flex: 1, minHeight: 0},
  content: {flex: 1, minHeight: 0},
});
