import React, {useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';
import NfcManager, {NfcTech} from 'react-native-nfc-manager';

import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {useAppTheme} from '../../../theme';

const TEMPO_LIMITE_MS = 40000;

const MENSAGEM_TEMPO_ESGOTADO =
  'Nenhuma etiqueta foi detectada. Verifique se o NFC está ligado e tente novamente.';

type LeitorProps = {
  onLeituraRealizada: (uid: string) => void;
  onErroLeitura: (mensagem: string) => void;
};

NfcManager.start();

const Leitor = ({onLeituraRealizada, onErroLeitura}: LeitorProps) => {
  const theme = useAppTheme();
  const callbacks = useRef({onLeituraRealizada, onErroLeitura});
  callbacks.current = {onLeituraRealizada, onErroLeitura};

  useEffect(() => {
    const ler = async () => {
      try {
        await NfcManager.requestTechnology(
          [NfcTech.IsoDep, NfcTech.NfcA, NfcTech.NfcB],
          {
            readerModeDelay: TEMPO_LIMITE_MS,
          },
        );

        const tag = await NfcManager.getTag();
        const uid = tag?.id;

        if (!uid) {
          throw new Error('Não foi possível ler o UID da etiqueta.');
        }

        callbacks.current.onLeituraRealizada(uid);
      } catch (ex: any) {
        callbacks.current.onErroLeitura(
          'Falha ao ler a etiqueta. Tente novamente.',
        );
      } finally {
        encerrar();
      }
    };

    const encerrar = () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };

    const tempoLimite = setTimeout(() => {
      encerrar();
      callbacks.current.onErroLeitura(MENSAGEM_TEMPO_ESGOTADO);
    }, TEMPO_LIMITE_MS);

    ler();

    return () => {
      clearTimeout(tempoLimite);
      encerrar();
    };
  }, []);

  return (
    <Tela>
      <VStack flex={1} align="center" justify="center" gap={16}>
        <Icon source="nfc" size={96} color={theme.colors.primary} />

        <VStack align="center" gap={4}>
          <Text variant="titleLarge" style={styles.centralizado}>
            Aproxime a etiqueta
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.centralizado,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Encoste o celular na etiqueta NFC para realizar a leitura.
          </Text>
        </VStack>
      </VStack>
    </Tela>
  );
};

const styles = StyleSheet.create({
  centralizado: {
    textAlign: 'center',
  },
});

export default Leitor;
