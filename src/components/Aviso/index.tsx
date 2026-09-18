import React from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';

import Card from '../Base/Card';
import VStack from '../Base/VStack';
import HStack from '../Base/HStack';
import {useAppTheme} from '../../theme';

type AvisoProps = {
  icone?: string;
  children: React.ReactNode;
};

const Aviso = ({icone = 'alert-outline', children}: AvisoProps) => {
  const theme = useAppTheme();

  return (
    <Card
      style={[styles.aviso, {backgroundColor: theme.colors.warningContainer}]}>
      <HStack gap={12} align="flex-start">
        <Icon
          source={icone}
          size={20}
          color={theme.colors.onWarningContainer}
        />
        <VStack flex={1}>
          <Text
            variant="bodySmall"
            style={{color: theme.colors.onWarningContainer}}>
            {children}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
};

const styles = StyleSheet.create({
  aviso: {
    borderRadius: 8,
    borderWidth: 0,
  },
});

export default Aviso;
