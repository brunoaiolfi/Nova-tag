import React, { useEffect } from 'react';

import Espera from '../../../../components/Nfc/Espera';

interface IBloquear {
  onBloquearTag: () => void;
}

const Bloquear = ({ onBloquearTag }: IBloquear) => {
  useEffect(() => {
    // TODO: adicionar a leitura NFC — ativar o reader mode e capturar
    const timeout = setTimeout(() => onBloquearTag(), 1500);

    return () => clearTimeout(timeout);
  }, [onBloquearTag]);

  return (
    <Espera
      titulo="Aproxime a etiqueta novamente"
      subtitulo="A gravação das chaves vai bloquear a escrita da etiqueta."
      onPress={onBloquearTag}
    />
  );
};

export default Bloquear;
