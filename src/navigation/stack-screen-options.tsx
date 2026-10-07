import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';
import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import type {TemaApp} from '../theme';

type BackNavigation = {goBack(): void};

/** Keep internal route names out of the back control on every platform. */
export function stackScreenOptions(
  theme: TemaApp,
  navigation: BackNavigation,
): NativeStackNavigationOptions {
  return {
    headerStyle: {backgroundColor: theme.colors.primary},
    headerTintColor: theme.colors.onPrimary,
    headerTitleStyle: {color: theme.colors.onPrimary, fontSize: 17},
    headerTitleAlign: 'center',
    headerShadowVisible: false,
    headerBackVisible: false,
    headerBackTitle: 'Voltar',
    headerLeft: ({canGoBack, tintColor}) =>
      canGoBack ? (
        <TouchableRipple
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.back}>
          <View style={styles.content}>
            <Icon source="chevron-left" size={26} color={tintColor} />
            <Text style={[styles.label, {color: tintColor}]}>Voltar</Text>
          </View>
        </TouchableRipple>
      ) : null,
  };
}

const styles = StyleSheet.create({
  back: {minHeight: 44, borderRadius: 12},
  content: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  label: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
});
