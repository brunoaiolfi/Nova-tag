import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ComponentesEtapa, DadosProvisionamento, Etapa } from './types';
import LeituraInicial from './LeituraInicial';
import IdentificarPedido from './IdentificarPedido';
import Bloquear from './Bloquear';
import Toast from 'react-native-toast-message';

const ETAPAS: ComponentesEtapa = {
  [Etapa.LEITURA_INICIAL]: LeituraInicial,
  [Etapa.IDENTIFICAR_PEDIDO]: IdentificarPedido,
  [Etapa.BLOQUEAR]: Bloquear,
};

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

  const avancarEtapa = React.useCallback(
    (dadosEtapa?: DadosProvisionamento | void) => {
      if (dadosEtapa) {
        setDados(atual => ({ ...atual, ...dadosEtapa }));
      }

      const proximaEtapa = ORDEM[ORDEM.indexOf(etapaAtual) + 1];

      if (!proximaEtapa) {
        Toast.show({
          type: 'success',
          text1: 'Hello',
          text2: 'This is some something 👋',
        });
        return;
      }

      setEtapaAtual(proximaEtapa);
    },
    [etapaAtual],
  );

  const RenderEtapa = ETAPAS[etapaAtual];

  return (
    <View style={styles.container}>
      <RenderEtapa avancarEtapa={avancarEtapa} dados={dados} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EtapasProvisionamento;
