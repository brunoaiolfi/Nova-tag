import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import InformativoEtapas from '../views/Eventos/InformativoEtapas';
import EtapasEvento from '../views/Eventos/Etapas';
import {useAppTheme} from '../theme';
import {stackScreenOptions} from './stack-screen-options';

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
      screenOptions={({navigation}) => stackScreenOptions(theme, navigation)}>
      <Stack.Screen
        name="InformativoEtapas"
        component={InformativoEtapas}
        options={{headerShown: false, title: 'Registrar etapa'}}
      />
      <Stack.Screen
        name="EtapasEvento"
        component={EtapasEvento}
        options={{title: 'Registrar etapa'}}
      />
    </Stack.Navigator>
  );
};

export default EventosNavigator;
