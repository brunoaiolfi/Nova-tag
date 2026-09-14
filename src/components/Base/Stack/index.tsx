import React from 'react';
import {View, ViewProps, ViewStyle} from 'react-native';

export interface StackProps extends ViewProps {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
  children?: React.ReactNode;
}

export interface StackBaseProps extends StackProps {
  direction: 'row' | 'column';
}

const Stack = ({
  direction,
  gap,
  align,
  justify,
  wrap,
  flex,
  style,
  children,
  ...rest
}: StackBaseProps) => {
  const estilo: ViewStyle = {
    flexDirection: direction,
    gap,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : undefined,
    flex,
  };

  return (
    <View {...rest} style={[estilo, style]}>
      {children}
    </View>
  );
};

export default Stack;
