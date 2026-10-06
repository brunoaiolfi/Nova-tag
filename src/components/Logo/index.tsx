import React from 'react';
import {Image, StyleSheet} from 'react-native';

export default function Logo({size = 160}: {size?: number}) {
  return (
    <Image
      source={require('../../../assets/logo.jpg')}
      accessibilityLabel="Logo Nova-tag NFC"
      accessible
      resizeMode="contain"
      style={[styles.logo, {width: size, height: size}]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {alignSelf: 'center', borderRadius: 16},
});
