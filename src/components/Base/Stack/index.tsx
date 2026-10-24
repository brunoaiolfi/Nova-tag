import React from 'react';
import {View, ViewProps, ViewStyle} from 'react-native';

export interface StackProps extends ViewProps {
  gap?: number | undefined;
  align?: ViewStyle['alignItems'] | undefined;
  justify?: ViewStyle['justifyContent'] | undefined;
  wrap?: boolean | undefined;
  flex?: number | undefined;
  children?: React.ReactNode | undefined;
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
