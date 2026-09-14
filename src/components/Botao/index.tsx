import React from 'react';
import {StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';

type BotaoProps = Omit<React.ComponentProps<typeof Button>, 'mode'>;

const Botao = ({
  style,
  contentStyle,
  labelStyle,
  children,
  ...rest
}: BotaoProps) => (
  <Button
    {...rest}
    mode="contained"
    style={[styles.botao, style]}
    contentStyle={[styles.conteudo, contentStyle]}
    labelStyle={[styles.label, labelStyle]}>
    {children}
  </Button>
);

const styles = StyleSheet.create({
  botao: {
    borderRadius: 8,
  },
  conteudo: {
    height: 48,
  },
  label: {
    fontSize: 16,
  },
});

export default Botao;
