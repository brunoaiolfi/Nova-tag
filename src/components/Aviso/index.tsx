import React from 'react';
import {StyleSheet} from 'react-native';
import {Icon, Text} from 'react-native-paper';

import Card from '../Base/Card';
import VStack from '../Base/VStack';
import HStack from '../Base/HStack';
import {trackingColors as colors} from '../Tracking';

type AvisoProps = {
  icone?: string;
  children: React.ReactNode;
};

const Aviso = ({icone = 'alert-outline', children}: AvisoProps) => {
  return (
    <Card style={[styles.aviso, {backgroundColor: colors.amberBackground}]}>
      <HStack gap={12} align="flex-start">
        <Icon source={icone} size={20} color={colors.amber} />
        <VStack flex={1}>
          <Text variant="bodySmall" style={{color: colors.amber}}>
            {children}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
};

const styles = StyleSheet.create({
  aviso: {
    borderRadius: 18,
    borderWidth: 0,
  },
});

export default Aviso;
