import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SelecionarEvento from './SelecionarEvento';
import Leitor from '../../../components/Nfc/Leitor';
import { toast } from '../../../infra/implementations/toast';
import { EnumTipoEvento } from '../../../domain/enums/tipoEvento';
import { pedidoEtiquetaApplication } from '../../../appplication/pedidoEtiqueta';

enum Etapa {
  SELECIONAR_EVENTO = 'selecionar_evento',
  LEITURA = 'leitura',
}

type DadosEvento = {
  tipo?: EnumTipoEvento;
  uid?: string;
};

const EtapasEvento = () => {
  const [etapaAtual, setEtapaAtual] = React.useState<Etapa>(
    Etapa.SELECIONAR_EVENTO,
  );
  const [dados, setDados] = React.useState<DadosEvento>({});

  const navigation = useNavigation();

  const isEtapaSelecionarEvento = etapaAtual === Etapa.SELECIONAR_EVENTO;
  const isEtapaLeitura = etapaAtual === Etapa.LEITURA;

  const handleSelecionarEvento = (tipo: EnumTipoEvento) => {
    setDados({ tipo });
    setEtapaAtual(Etapa.LEITURA);
  };

  const handleErroLeitura = (mensagem: string) => {
    toast.erro(mensagem);
    setEtapaAtual(Etapa.SELECIONAR_EVENTO);
  };

  const handleLeituraRealizada = async (uid: string) => {
    setDados(dadosAtuais => ({ ...dadosAtuais, uid }));

    if (!dados.tipo) {
      handleErroLeitura('Selecione o tipo do evento antes de ler a etiqueta.');
      return;
    }

    try {
      const resposta = await pedidoEtiquetaApplication.anexarEvento({
        codigoEtiqueta: uid,
        tipoEvento: dados.tipo,
      });

      if (!resposta.sucesso) {
        handleErroLeitura(resposta.mensagem);
        return;
      }

      toast.sucesso(resposta.mensagem);

      navigation.goBack();
    } catch (ex) {
      handleErroLeitura('Falha ao registrar o evento. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      {isEtapaSelecionarEvento && (
        <SelecionarEvento
          tipoInicial={dados.tipo}
          onSelecionarEvento={handleSelecionarEvento}
        />
      )}

      {isEtapaLeitura && (
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

export default EtapasEvento;
