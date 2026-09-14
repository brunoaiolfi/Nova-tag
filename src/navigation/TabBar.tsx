import React from 'react';
import {BottomNavigation} from 'react-native-paper';
import {CommonActions} from '@react-navigation/native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

const TabBar = ({state, descriptors, navigation, insets}: BottomTabBarProps) => (
  <BottomNavigation.Bar
    navigationState={state}
    safeAreaInsets={insets}
    onTabPress={({route, preventDefault}) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) {
        preventDefault();
        return;
      }

      navigation.dispatch({
        ...CommonActions.navigate(route.name, route.params),
        target: state.key,
      });
    }}
    renderIcon={({route, focused, color}) =>
      descriptors[route.key].options.tabBarIcon?.({
        focused,
        color,
        size: 24,
      }) ?? null
    }
    getLabelText={({route}) =>
      descriptors[route.key].options.title ?? route.name
    }
  />
);

export default TabBar;
