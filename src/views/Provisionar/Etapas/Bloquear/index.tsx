import React, {useEffect} from 'react';

import Espera from '../../../../components/Nfc/Espera';
import {Etapa, type EtapaProps} from '../types';

const Bloquear = ({avancarEtapa}: EtapaProps<Etapa.BLOQUEAR>) => {
  useEffect(() => {
    // TODO: adicionar a leitura NFC — ativar o reader mode e capturar
    const timeout = setTimeout(() => avancarEtapa(), 1500);

    return () => clearTimeout(timeout);
  }, [avancarEtapa]);

  return (
    <Espera
      titulo="Aproxime a etiqueta novamente"
      subtitulo="A gravação das chaves vai bloquear a escrita da etiqueta."
      onPress={avancarEtapa}
    />
  );
};

export default Bloquear;
