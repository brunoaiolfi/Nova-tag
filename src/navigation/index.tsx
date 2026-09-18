import React from 'react';
import {
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Icon} from 'react-native-paper';

import TabBar from './TabBar';
import {useAppTheme} from '../theme';
import ProvisionarNavigator from './ProvisionarNavigator';
import Home from '../views/Home';
import EventosNavigator from './EventosNavigator';

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
  ({color, size}: IconeTabProps) =>
    <Icon source={source} color={color} size={size} />;

const IconeProvisionar = criarIconeTab('nfc-tap');
const IconeHome = criarIconeTab('home-variant');
const IconeEventos = criarIconeTab('timeline-text-outline');

const Tab = createBottomTabNavigator<RotasTab>();

const Navigator = () => {
  const theme = useAppTheme();

  const navigationTheme = {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{headerShown: false}}
        tabBar={TabBar}>
        <Tab.Screen
          name="Provisionar"
          component={ProvisionarNavigator}
          options={({route}) => ({
            title: 'Provisionar',
            tabBarIcon: IconeProvisionar,
            tabBarStyle:
              getFocusedRouteNameFromRoute(route) === 'EtapasProvisionamento'
                ? {display: 'none'}
                : undefined,
          })}
        />
        <Tab.Screen
          name="Home"
          component={Home}
          options={{title: 'Home', tabBarIcon: IconeHome}}
        />
        <Tab.Screen
          name="Eventos"
          component={EventosNavigator}
          options={({route}) => ({
            title: 'Eventos',
            tabBarIcon: IconeEventos,
            tabBarStyle:
              getFocusedRouteNameFromRoute(route) === 'EtapasEvento'
                ? {display: 'none'}
                : undefined,
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
