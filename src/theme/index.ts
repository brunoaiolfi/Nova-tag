import {MD3LightTheme, useTheme} from 'react-native-paper';
import {
  arredondamento,
  error,
  espacamento,
  gray,
  info,
  success,
  warning,
} from './cores';

export {cores} from './cores';

const BRANCO = '#FFFFFF';

export const tema = {
  ...MD3LightTheme,
  roundness: arredondamento,
  fonts: {
    ...MD3LightTheme.fonts,
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontSize: 16,
      lineHeight: 24,
    },
    bodySmall: {...MD3LightTheme.fonts.bodySmall, fontSize: 14, lineHeight: 21},
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontSize: 18,
      lineHeight: 26,
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontSize: 17,
      lineHeight: 24,
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontSize: 16,
      lineHeight: 22,
    },
  },
  spacing: espacamento,
  colors: {
    ...MD3LightTheme.colors,

    primary: '#155EEF',
    onPrimary: BRANCO,
    primaryContainer: '#EAF1FA',
    onPrimaryContainer: '#1649A9',
    inversePrimary: gray[900],

    secondary: '#087F71',
    onSecondary: BRANCO,
    secondaryContainer: '#E8F6F1',
    onSecondaryContainer: '#086458',

    tertiary: gray[400],
    onTertiary: BRANCO,
    tertiaryContainer: gray[50],
    onTertiaryContainer: gray[800],

    background: '#F3F6FA',
    onBackground: '#152B42',
    surface: BRANCO,
    onSurface: '#152B42',
    surfaceVariant: gray[50],
    onSurfaceVariant: '#526779',
    surfaceDisabled: gray[300],
    onSurfaceDisabled: gray[500],
    inverseSurface: gray[50],
    inverseOnSurface: gray[700],

    outline: gray[300],
    outlineVariant: '#D6E1EB',

    error: error[600],
    onError: BRANCO,
    errorContainer: error[600],
    onErrorContainer: BRANCO,

    success: success[600],
    onSuccess: BRANCO,
    successContainer: success[600],
    onSuccessContainer: BRANCO,

    warning: warning[600],
    onWarning: BRANCO,
    warningContainer: warning[600],
    onWarningContainer: BRANCO,

    info: info[600],
    onInfo: BRANCO,
    infoContainer: info[600],
    onInfoContainer: BRANCO,

    elevation: {
      level0: 'transparent',
      level1: BRANCO,
      level2: BRANCO,
      level3: BRANCO,
      level4: BRANCO,
      level5: BRANCO,
    },
  },
};

export type TemaApp = typeof tema;

export const useAppTheme = () => useTheme<TemaApp>();
