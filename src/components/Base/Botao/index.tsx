import React from 'react';
import {StyleSheet} from 'react-native';
import {ActionButton as Button} from '../../Tracking';

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
    borderRadius: 18,
  },
  conteudo: {
    minHeight: 60,
  },
  label: {
    fontSize: 17,
  },
});

export default Botao;
