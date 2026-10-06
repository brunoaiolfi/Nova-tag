import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';
import {CommonActions} from '@react-navigation/native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {palette as colors} from '../theme/tokens';

const TabBar = ({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) => {
  const rotaFocada = state.routes[state.index];
  const estilo = StyleSheet.flatten(
    descriptors[rotaFocada.key].options.tabBarStyle,
  ) as ViewStyle | undefined;

  if (estilo?.display === 'none') {
    return null;
  }

  return (
    <View
      style={[
        layoutStyles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
        },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const color = focused ? colors.blue : colors.muted;
        const isRegister = route.name === 'Eventos';
        return (
          <TouchableRipple
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{selected: focused}}
            accessibilityLabel={
              options.tabBarAccessibilityLabel ?? options.title ?? route.name
            }
            onLongPress={() =>
              navigation.emit({type: 'tabLongPress', target: route.key})
            }
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.dispatch({
                  ...CommonActions.navigate(route.name, route.params),
                  target: state.key,
                });
              }
            }}
            style={layoutStyles.touch}>
            <View style={layoutStyles.item}>
              <View
                style={[
                  layoutStyles.icon,
                  focused && layoutStyles.selected,
                  isRegister && layoutStyles.register,
                ]}>
                {isRegister ? (
                  <Icon source="plus" size={27} color={colors.navy} />
                ) : (
                  options.tabBarIcon?.({focused, color, size: 25})
                )}
              </View>
              <Text
                style={[
                  layoutStyles.label,
                  {color},
                  focused && layoutStyles.activeLabel,
                ]}>
                {options.title ?? route.name}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
};

export default TabBar;

const layoutStyles = StyleSheet.create({
  bar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  touch: {flex: 1, borderRadius: 16, minHeight: 66},
  item: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  icon: {
    width: 48,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {backgroundColor: colors.pale},
  register: {backgroundColor: colors.orange},
  label: {fontSize: 12, lineHeight: 18, textAlign: 'center'},
  activeLabel: {fontWeight: '700'},
});
