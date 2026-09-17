import React from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

import { DadosProvisionamento, Etapa } from './types';
import IdentificarPedido from './IdentificarPedido';
import Leitor from '../../../components/Nfc/Leitor';
import { provisionarEtiqueta } from '../../../services/provisionamento';

const EtapasProvisionamento = () => {
  const [etapaAtual, setEtapaAtual] = React.useState<Etapa>(
    Etapa.IDENTIFICAR_PEDIDO,
  );

  const [dados, setDados] = React.useState<DadosProvisionamento>({});

  const navigation = useNavigation();

  const isEtapaIdentificarPedido = etapaAtual === Etapa.IDENTIFICAR_PEDIDO;
  const isEtapaLeituraEBloqueio = etapaAtual === Etapa.LEITURA_E_BLOQUEIO;

  const handleIdentificarPedido = (codigoPedido: string) => {
    setDados({ codigoPedido });
    setEtapaAtual(Etapa.LEITURA_E_BLOQUEIO);
  };

  const handleErroLeitura = (mensagem: string) => {
    Toast.show({
      type: 'error',
      text1: mensagem,
    });

    setEtapaAtual(Etapa.IDENTIFICAR_PEDIDO);
  };

  const handleLeituraRealizada = async (uid: string) => {
    setDados(dadosAtuais => ({ ...dadosAtuais, uid }));

    try {
      await provisionarEtiqueta({ codigoPedido: dados.codigoPedido ?? '', uid });

      Toast.show({
        type: 'success',
        text1: 'Tag provisionada com sucesso!',
      });

      navigation.goBack();
    } catch (ex) {
      handleErroLeitura('Falha ao provisionar a etiqueta. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      {isEtapaIdentificarPedido && (
        <IdentificarPedido
          codigoPedidoInicial={dados.codigoPedido}
          onIdentificarPedido={handleIdentificarPedido}
        />
      )}

      {isEtapaLeituraEBloqueio && (
        <Leitor
          onLeituraRealizada={handleLeituraRealizada}
          onErroLeitura={handleErroLeitura}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EtapasProvisionamento;
