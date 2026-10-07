import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import InformativoEtapas from '../views/Provisionar/InformativoEtapas';
import EtapasProvisionamento from '../views/Provisionar/Etapas';
import Diagnostico from '../views/Provisionar/Diagnostico';
import Gerenciar from '../views/Provisionar/Gerenciar';
import Administracao from '../views/Provisionar/Administracao';
import {useAppTheme} from '../theme';
import {EnumEstrategiasNFC} from '../domain/enums/estrategiasNFC';
import {stackScreenOptions} from './stack-screen-options';

export type RotasProvisionar = {
  InformativoEtapas: undefined;
  EtapasProvisionamento: {
    estrategia: EnumEstrategiasNFC;
    expectedUid?: string;
    registeredModel?: string;
  };
  Diagnostico: undefined;
  Gerenciar: {provisioningId?: string} | undefined;
  Administracao: {provisioningId?: string} | undefined;
};

const Stack = createNativeStackNavigator<RotasProvisionar>();

const ProvisionarNavigator = () => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      initialRouteName="InformativoEtapas"
      screenOptions={({navigation}) => stackScreenOptions(theme, navigation)}>
      <Stack.Screen
        name="InformativoEtapas"
        component={InformativoEtapas}
        options={{headerShown: false, title: 'Vincular etiqueta'}}
      />
      <Stack.Screen
        name="EtapasProvisionamento"
        component={EtapasProvisionamento}
        options={{title: 'Vincular etiqueta'}}
      />
      <Stack.Screen
        name="Diagnostico"
        component={Diagnostico}
        options={{title: 'Diagnóstico NFC'}}
      />
      <Stack.Screen
        name="Administracao"
        component={Administracao}
        options={{title: 'Configurar etiqueta'}}
      />
      <Stack.Screen
        name="Gerenciar"
        component={Gerenciar}
        options={{title: 'Gerenciar etiqueta'}}
      />
    </Stack.Navigator>
  );
};

export default ProvisionarNavigator;
