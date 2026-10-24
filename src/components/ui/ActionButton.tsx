import React from 'react';
import {StyleSheet, View, StyleProp, ViewStyle} from 'react-native';
import {
  ActivityIndicator,
  Button as PaperButton,
  Icon,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import {useAppTheme} from '../../theme';
import {palette} from '../../theme/tokens';

type SupportedPaperProps = Pick<
  React.ComponentProps<typeof PaperButton>,
  | 'children'
  | 'contentStyle'
  | 'labelStyle'
  | 'mode'
  | 'disabled'
  | 'loading'
  | 'icon'
  | 'buttonColor'
  | 'textColor'
  | 'accessibilityLabel'
  | 'accessibilityHint'
  | 'onPress'
  | 'onLongPress'
  | 'testID'
>;
export type ActionButtonProps = {
  [Key in keyof SupportedPaperProps]: SupportedPaperProps[Key] | undefined;
} & {style?: StyleProp<ViewStyle>};

export function ActionButton({
  contentStyle,
  labelStyle,
  style,
  children,
  mode = 'text',
  disabled,
  loading,
  icon,
  buttonColor,
  textColor,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLongPress,
  testID,
}: ActionButtonProps) {
  const theme = useAppTheme();
  const contained = mode === 'contained' || mode === 'contained-tonal';
  const backgroundColor =
    disabled && contained
      ? '#E2E8F0'
      : contained
      ? buttonColor ?? theme.colors.primary
      : 'transparent';
  const color = disabled
    ? '#68798A'
    : textColor ?? (contained ? theme.colors.onPrimary : theme.colors.primary);
  const borderColor = disabled ? palette.line : theme.colors.outline;
  return (
    <TouchableRipple
      {...(onPress ? {onPress} : {})}
      {...(onLongPress ? {onLongPress} : {})}
      disabled={!!disabled || !!loading}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled || !!loading, busy: !!loading}}
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === 'string' ? children : undefined)
      }
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[
        styles.button,
        {backgroundColor, borderColor},
        mode === 'outlined' && styles.outlinedButton,
        style,
      ]}>
      <View
        style={[
          styles.buttonContent,
          mode === 'text' && styles.textButtonContent,
          contentStyle,
        ]}>
        {loading ? (
          <ActivityIndicator size={20} color={color} />
        ) : icon ? (
          <Icon source={icon} size={22} color={color} />
        ) : null}
        <Text
          style={[
            styles.buttonLabel,
            mode === 'text' && styles.textButtonLabel,
            {color},
            labelStyle,
          ]}>
          {children}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  button: {borderRadius: 18, overflow: 'hidden'},
  outlinedButton: {borderWidth: 1},
  buttonContent: {
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  textButtonContent: {minHeight: 44, paddingVertical: 10},
  textButtonLabel: {fontSize: 15, lineHeight: 22},
});
