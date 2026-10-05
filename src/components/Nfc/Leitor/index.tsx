import React, {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {Button, HelperText, Icon, Text, TextInput} from 'react-native-paper';
import Tela from '../../Base/Tela';
import VStack from '../../Base/VStack';
import {useAppTheme} from '../../../theme';

type LeitorProps = {
  textoParaGravar?: string;
  onLeituraRealizada: (uid: string, textoNdef?: string) => void;
  onErroLeitura: (mensagem: string) => void;
};

export default function Leitor({
  textoParaGravar,
  onLeituraRealizada,
  onErroLeitura,
}: LeitorProps) {
  const theme = useAppTheme();
  const [uid, setUid] = useState('04A1B2C3D4E5F6');
  const [ndef, setNdef] = useState(textoParaGravar ?? '');
  const normalizedUid = uid.replace(/[\s:-]/g, '').toUpperCase();
  const valid = /^(?:[A-F0-9]{2}){4,10}$/.test(normalizedUid);
  return (
    <Tela>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <VStack gap={16}>
          <Icon source="nfc" size={64} color={theme.colors.primary} />
          <Text variant="headlineSmall">Captura simulada</Text>
          <Text>
            O Expo Go não lê, grava nem bloqueia etiquetas NFC. Informe dados
            fictícios para testar as telas.
          </Text>
          <TextInput
            label="UID simulado"
            value={uid}
            onChangeText={setUid}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {!valid && (
            <HelperText type="error">
              Informe de 4 a 10 bytes em hexadecimal.
            </HelperText>
          )}
          <TextInput
            label={
              textoParaGravar
                ? 'Texto NDEF simulado para gravação'
                : 'Texto NDEF simulado (opcional)'
            }
            value={textoParaGravar ?? ndef}
            onChangeText={setNdef}
            editable={textoParaGravar === undefined}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            mode="contained"
            disabled={!valid}
            onPress={() =>
              onLeituraRealizada(
                normalizedUid,
                textoParaGravar ?? (ndef || undefined),
              )
            }>
            Simular captura
          </Button>
          <Button
            onPress={() =>
              onErroLeitura(
                'Falha simulada na captura. Nenhuma etiqueta foi acessada.',
              )
            }>
            Simular falha
          </Button>
        </VStack>
      </ScrollView>
    </Tela>
  );
}
const styles = StyleSheet.create({content: {padding: 20, flexGrow: 1}});
