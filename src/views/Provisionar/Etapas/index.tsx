import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DadosProvisionamento, Etapa } from './types';
import Toast from 'react-native-toast-message';
import LeituraInicial from './LeituraInicial';
import IdentificarPedido from './IdentificarPedido';
import Bloquear from './Bloquear';
import { useNavigation } from '@react-navigation/native';

const ORDEM: Etapa[] = [
  Etapa.LEITURA_INICIAL,
  Etapa.IDENTIFICAR_PEDIDO,
  Etapa.BLOQUEAR,
];


const EtapasProvisionamento = () => {
  const [etapaAtual, setEtapaAtual] = React.useState<Etapa>(
    Etapa.LEITURA_INICIAL,
  );

  const [dados, setDados] = React.useState<DadosProvisionamento>({});

  const navigation = useNavigation();

  const isEtapaLeituraInicial = etapaAtual === Etapa.LEITURA_INICIAL;
  const isEtapaIdentificarPedido = etapaAtual === Etapa.IDENTIFICAR_PEDIDO;
  const isEtapaBloquear = etapaAtual === Etapa.BLOQUEAR;

  const handleLeituraNfc = (uid: string) => {
    setDados({ codigoPedido: '', uid });
    setEtapaAtual(Etapa.IDENTIFICAR_PEDIDO);
  };

  const handleIdentificarPedido = (codigoPedido: string) => {
    setDados({ ...dados, codigoPedido });
    setEtapaAtual(Etapa.BLOQUEAR);
  };

  const handleBloquearTag = () => {
    Toast.show({
      type: 'success',
      text1: 'Tag bloqueada com sucesso!',
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {isEtapaLeituraInicial && <LeituraInicial onLeituraNfc={handleLeituraNfc} />}
      {isEtapaIdentificarPedido && <IdentificarPedido codigoTag={dados.uid || ''} onIdentificarPedido={handleIdentificarPedido} />}
      {isEtapaBloquear && <Bloquear onBloquearTag={handleBloquearTag} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EtapasProvisionamento;
