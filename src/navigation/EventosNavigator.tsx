import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import InformativoEtapas from '../views/Eventos/InformativoEtapas';
import EtapasEvento from '../views/Eventos/Etapas';
import {useAppTheme} from '../theme';

export type RotasEventos = {
  InformativoEtapas: undefined;
  EtapasEvento: undefined;
};

const Stack = createNativeStackNavigator<RotasEventos>();

const EventosNavigator = () => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      initialRouteName="InformativoEtapas"
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {color: theme.colors.onPrimary},
      }}>
      <Stack.Screen
        name="InformativoEtapas"
        component={InformativoEtapas}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="EtapasEvento"
        component={EtapasEvento}
        options={{title: 'Registrar evento'}}
      />
    </Stack.Navigator>
  );
};

export default EventosNavigator;
