import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';

import {gray} from '../../theme/cores';
import {useAppTheme} from '../../theme';

const Card = ({style, children, ...rest}: ViewProps) => {
  const theme = useAppTheme();

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.roundness,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: gray[200],
  },
});

export default Card;
