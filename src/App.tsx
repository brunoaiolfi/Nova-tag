import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MD3DarkTheme, MD3LightTheme, PaperProvider} from 'react-native-paper';

import Navigator from './navigation';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <Navigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;
