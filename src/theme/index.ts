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
  spacing: espacamento,
  colors: {
    ...MD3LightTheme.colors,

    primary: gray[900],
    onPrimary: BRANCO,
    primaryContainer: gray[900],
    onPrimaryContainer: BRANCO,
    inversePrimary: gray[900],

    secondary: gray[600],
    onSecondary: BRANCO,
    secondaryContainer: gray[600],
    onSecondaryContainer: BRANCO,

    tertiary: gray[400],
    onTertiary: BRANCO,
    tertiaryContainer: gray[50],
    onTertiaryContainer: gray[800],

    background: gray[50],
    onBackground: gray[700],
    surface: BRANCO,
    onSurface: gray[700],
    surfaceVariant: gray[50],
    onSurfaceVariant: gray[700],
    surfaceDisabled: gray[300],
    onSurfaceDisabled: gray[500],
    inverseSurface: gray[50],
    inverseOnSurface: gray[700],

    outline: gray[300],
    outlineVariant: gray[500],

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
