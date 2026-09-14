import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import InformativoEtapas from '../views/Provisionar/InformativoEtapas';
import Etapas from '../views/Provisionar/Etapas';
import {useAppTheme} from '../theme';

export type RotasProvisionar = {
  InformativoEtapas: undefined;
  Etapas: undefined;
};

const Stack = createNativeStackNavigator<RotasProvisionar>();

const ProvisionarNavigator = () => {
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
        name="Etapas"
        component={Etapas}
        options={{title: 'Etapas'}}
      />
    </Stack.Navigator>
  );
};

export default ProvisionarNavigator;
