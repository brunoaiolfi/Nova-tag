import React from 'react';

import Espera from '../../../../components/Nfc/Espera';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

interface ILeituraInicial {
  onLeituraNfc: (uid: string) => void;
}

NfcManager.start();

const LeituraInicial = ({ onLeituraNfc }: ILeituraInicial) => {

  async function readNdef() {
    try {
      await NfcManager.requestTechnology([NfcTech.IsoDep, NfcTech.NfcA, NfcTech.NfcB]);
      const tag = await NfcManager.getTag();
      onLeituraNfc(tag?.id ?? '');
    } catch (ex) {
      console.log('Oops!', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }


  return <Espera onPress={readNdef} />;
};

export default LeituraInicial;
