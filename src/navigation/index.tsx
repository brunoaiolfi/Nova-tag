import React from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Icon, adaptNavigationTheme, useTheme} from 'react-native-paper';

import TabBar from './TabBar';
import Provisionar from '../views/Provisionar';
import Home from '../views/Home';
import Eventos from '../views/Eventos';

export type RotasTab = {
  Provisionar: undefined;
  Home: undefined;
  Eventos: undefined;
};

type IconeTabProps = {
  color: string;
  size: number;
};

const criarIconeTab =
  (source: string) =>
  ({color, size}: IconeTabProps) => (
    <Icon source={source} color={color} size={size} />
  );

const IconeProvisionar = criarIconeTab('nfc-tap');
const IconeHome = criarIconeTab('home-variant');
const IconeEventos = criarIconeTab('timeline-text-outline');

const Tab = createBottomTabNavigator<RotasTab>();

const {LightTheme, DarkTheme} = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const Navigator = () => {
  const theme = useTheme();

  const navigationTheme = theme.dark
    ? {...DarkTheme, fonts: NavigationDarkTheme.fonts}
    : {...LightTheme, fonts: NavigationDefaultTheme.fonts};

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{headerShown: false}}
        tabBar={TabBar}>
        <Tab.Screen
          name="Provisionar"
          component={Provisionar}
          options={{title: 'Provisionar', tabBarIcon: IconeProvisionar}}
        />
        <Tab.Screen
          name="Home"
          component={Home}
          options={{title: 'Home', tabBarIcon: IconeHome}}
        />
        <Tab.Screen
          name="Eventos"
          component={Eventos}
          options={{title: 'Eventos', tabBarIcon: IconeEventos}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
