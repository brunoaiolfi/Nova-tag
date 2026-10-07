import React from 'react';
import {
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  getFocusedRouteNameFromRoute,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {Icon} from 'react-native-paper';

import TabBar from './TabBar';
import {useAppTheme} from '../theme';
import ProvisionarNavigator from './ProvisionarNavigator';
import type {RotasProvisionar} from './ProvisionarNavigator';
import Home from '../views/Home';
import EventosNavigator from './EventosNavigator';
import {useSession} from '../components/Auth/SessionProvider';
import Historico from '../views/Historico';
import Envios from '../views/Envios';
import type {Reading} from '../appplication/traceability/workflow';

export type RotasTab = {
  Provisionar: NavigatorScreenParams<RotasProvisionar> | undefined;
  Home: undefined;
  Eventos: undefined;
  Historico: {reading?: Reading} | undefined;
  Envios: undefined;
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
const IconeHistorico = criarIconeTab('map-marker-path');
const IconeEnvios = criarIconeTab('cloud-upload-outline');

const Tab = createBottomTabNavigator<RotasTab>();
// React Navigation calls this renderer as a callback, so the hook-using bar
// must be mounted as a component instead of invoked directly.
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

const Navigator = () => {
  const {state} = useSession();
  const role = state.session?.user.perfil;
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
        tabBar={renderTabBar}>
        <Tab.Screen
          name="Home"
          component={Home}
          options={{title: 'Início', tabBarIcon: IconeHome}}
        />
        <Tab.Screen
          name="Historico"
          component={Historico}
          options={{title: 'Rastreio', tabBarIcon: IconeHistorico}}
        />
        <Tab.Screen
          name="Envios"
          component={Envios}
          options={{title: 'Envios', tabBarIcon: IconeEnvios}}
        />
        {role !== 'CONSULTA' && (
          <Tab.Screen
            name="Eventos"
            component={EventosNavigator}
            options={({route}) => ({
              title: 'Registrar',
              tabBarIcon: IconeEventos,
              tabBarStyle:
                getFocusedRouteNameFromRoute(route) === 'EtapasEvento'
                  ? {display: 'none'}
                  : undefined,
            })}
          />
        )}
        {role === 'ADMINISTRADOR' && state.status === 'authenticated' && (
          <Tab.Screen
            name="Provisionar"
            component={ProvisionarNavigator}
            options={({route}) => ({
              title: 'Vincular',
              tabBarIcon: IconeProvisionar,
              tabBarStyle: [
                'EtapasProvisionamento',
                'Diagnostico',
                'Gerenciar',
                'Administracao',
              ].includes(getFocusedRouteNameFromRoute(route) ?? '')
                ? {display: 'none'}
                : undefined,
            })}
          />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
