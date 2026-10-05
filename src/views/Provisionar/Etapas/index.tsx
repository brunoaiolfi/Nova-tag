import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { DadosProvisionamento, Etapa } from './types';
import IdentificarPedido from './IdentificarPedido';
import Leitor from '../../../components/Nfc/Leitor';
import { toast } from '../../../infra/implementations/toast';
import { pedidoEtiquetaApplication } from '../../../appplication/pedidoEtiqueta';
import type { RotasProvisionar } from '../../../navigation/ProvisionarNavigator';
import { EnumEstrategiasNFC } from '../../../domain/enums/estrategiasNFC';

const EtapasProvisionamento = () => {
  const [etapaAtual, setEtapaAtual] = React.useState<Etapa>(
    Etapa.IDENTIFICAR_PEDIDO,
  );
  const [dados, setDados] = React.useState<DadosProvisionamento>({});

  const navigation = useNavigation();
  const { estrategia } =
    useRoute<RouteProp<RotasProvisionar, 'EtapasProvisionamento'>>().params;

  const isEtapaIdentificarPedido = etapaAtual === Etapa.IDENTIFICAR_PEDIDO;
  const isEtapaLeituraEBloqueio = etapaAtual === Etapa.LEITURA_E_BLOQUEIO;

  const handleIdentificarPedido = (codigoPedido: string) => {
    setDados({ codigoPedido });
    setEtapaAtual(Etapa.LEITURA_E_BLOQUEIO);
  };

  const handleErroLeitura = (mensagem: string) => {
    toast.erro(mensagem);

    setEtapaAtual(Etapa.IDENTIFICAR_PEDIDO);
  };

  const handleLeituraRealizada = async (uid: string) => {
    setDados(dadosAtuais => ({ ...dadosAtuais, uid }));

    try {
      const resposta = await pedidoEtiquetaApplication.provisionarConformeEstrategia({ codigoPedido: dados.codigoPedido ?? '', codigoEtiqueta: uid }, estrategia);

      if (!resposta.sucesso) {
        handleErroLeitura(resposta.mensagem);
        return;
      }

      toast.sucesso(resposta.mensagem);

      navigation.goBack();
    } catch {
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
          textoParaGravar={
            estrategia === EnumEstrategiasNFC.NDEF_ESTATICO
              ? dados.codigoPedido
              : undefined
          }
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
