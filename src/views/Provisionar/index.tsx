import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, Divider, Icon, Text} from 'react-native-paper';

import {useAppTheme} from '../../theme';

type Passo = {
  numero: number;
  titulo: string;
  descricao: string;
};

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Ler a etiqueta',
    descricao:
      'Aproxime a etiqueta para identificar o UID e o modelo do chip.',
  },
  {
    numero: 2,
    titulo: 'Escolher a estratégia',
    descricao:
      'Apenas as estratégias suportadas pelo modelo detectado ficam disponíveis.',
  },
  {
    numero: 3,
    titulo: 'Identificar o pedido',
    descricao: 'Busque pelo código do pedido que será vinculado à etiqueta.',
  },
  {
    numero: 4,
    titulo: 'Conferir os dados',
    descricao: 'Revise UID, modelo, estratégia e pedido antes de confirmar.',
  },
  {
    numero: 5,
    titulo: 'Bloquear a etiqueta',
    descricao:
      'Aproxime a mesma etiqueta novamente para gravar as chaves e bloquear a escrita.',
  },
];

const ItemPasso = ({passo}: {passo: Passo}) => {
  const theme = useAppTheme();

  return (
    <View style={styles.passo}>
      <View
        style={[styles.numero, {backgroundColor: theme.colors.primary}]}
        accessible={false}>
        <Text variant="labelLarge" style={{color: theme.colors.onPrimary}}>
          {passo.numero}
        </Text>
      </View>

      <View style={styles.passoTexto}>
        <Text variant="titleMedium">{passo.titulo}</Text>
        <Text
          variant="bodySmall"
          style={[styles.descricao, {color: theme.colors.onSurfaceVariant}]}>
          {passo.descricao}
        </Text>
      </View>
    </View>
  );
};

const Provisionar = () => {
  const theme = useAppTheme();

  const iniciar = () => {
    // TODO: iniciar o fluxo de provisionamento
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.tela, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Icon source="nfc-tap" size={48} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={styles.titulo}>
            Provisionar etiqueta
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitulo, {color: theme.colors.onSurfaceVariant}]}>
            Vincula uma etiqueta NFC a um pedido e bloqueia sua escrita.
          </Text>
        </View>

        <Divider style={styles.divisor} />

        {PASSOS.map(passo => (
          <ItemPasso key={passo.numero} passo={passo} />
        ))}

        <View
          style={[styles.aviso, {backgroundColor: theme.colors.warningContainer}]}>
          <Icon
            source="alert-outline"
            size={20}
            color={theme.colors.onWarningContainer}
          />
          <Text
            variant="bodySmall"
            style={[
              styles.avisoTexto,
              {color: theme.colors.onWarningContainer},
            ]}>
            O bloqueio altera as chaves da etiqueta. Confira os dados antes de
            confirmar.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.rodape,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
          },
        ]}>
        <Button mode="contained" icon="nfc-tap" onPress={iniciar}>
          Iniciar
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tela: {
    flex: 1,
  },
  conteudo: {
    padding: 24,
    paddingBottom: 32,
  },
  cabecalho: {
    alignItems: 'center',
  },
  titulo: {
    marginTop: 12,
    textAlign: 'center',
  },
  subtitulo: {
    marginTop: 4,
    textAlign: 'center',
  },
  divisor: {
    marginVertical: 24,
  },
  passo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  passoTexto: {
    flex: 1,
  },
  descricao: {
    marginTop: 2,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  avisoTexto: {
    flex: 1,
  },
  rodape: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default Provisionar;
