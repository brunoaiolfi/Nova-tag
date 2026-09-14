import React, {useEffect} from 'react';

import Espera from '../../../../components/Nfc/Espera';
import {Etapa, type EtapaProps} from '../types';

/** Mock: tempo simulado de leitura enquanto o NFC não está implementado. */
const TEMPO_MOCK_LEITURA = 1500;

/** Mock: UID fixo até a leitura NFC existir. */
const MOCK_UID = '04A1B2C3D4E580';

const LeituraInicial = ({avancarEtapa}: EtapaProps<Etapa.LEITURA_INICIAL>) => {
  useEffect(() => {
    // TODO: adicionar a leitura NFC — ativar o reader mode e capturar
    // UID, techList e GET_VERSION, avançando quando a etiqueta for lida.
    const timeout = setTimeout(
      () => avancarEtapa({uid: MOCK_UID}),
      TEMPO_MOCK_LEITURA,
    );

    return () => clearTimeout(timeout);
  }, [avancarEtapa]);

  return <Espera />;
};

export default LeituraInicial;
