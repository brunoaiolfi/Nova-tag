import {ActionButton as Button} from '../../components/Tracking';
import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {HelperText, Icon, Text, TextInput} from 'react-native-paper';
import {useSession} from '../../components/Auth/SessionProvider';
import {defaultApiUrl} from '../../infra/auth/default-api-url';
import {SessionError} from '../../domain/auth/types';
import {RouteMotif, trackingColors as colors} from '../../components/Tracking';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function Login() {
  const {manager, state} = useSession();
  const [server, setServer] = useState(defaultApiUrl);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connectionSettings, setConnectionSettings] = useState(!server.trim());
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
  const compact = height < 700 || width < 360;
  const submit = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await manager.login(server, login, password);
    } catch (failure) {
      if (failure instanceof SessionError && failure.code === 'URL_INVALIDA') {
        setConnectionSettings(true);
      }
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível entrar.',
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <StatusBar barStyle="light-content" backgroundColor={colors.blue} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.welcome, {paddingTop: 16 + insets.top}]}>
          <View style={styles.brand}>
            <Icon source="nfc-variant" size={26} color="white" />
            <Text style={styles.brandName}>Nova-tag</Text>
          </View>
          {!compact && <RouteMotif />}
          <Text style={styles.headline}>Do cadastro à entrega.</Text>
          <Text style={styles.description}>
            Uma etiqueta. Todas as etapas conectadas.
          </Text>
        </View>
        <View style={[styles.form, {paddingBottom: 24 + insets.bottom}]}>
          <View style={styles.formHeading}>
            <Text variant="headlineSmall" style={styles.formTitle}>
              Entrar no Nova-tag
            </Text>
            <Text style={styles.formDescription}>
              Use sua conta do laboratório para continuar.
            </Text>
          </View>
          <TextInput
            mode="outlined"
            label="Login"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            editable={!busy}
          />
          <TextInput
            mode="outlined"
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                accessibilityLabel={
                  showPassword ? 'Ocultar senha' : 'Mostrar senha'
                }
                disabled={busy}
                onPress={() => setShowPassword(value => !value)}
              />
            }
            autoComplete="current-password"
            textContentType="password"
            editable={!busy}
            onSubmitEditing={() => {
              void submit();
            }}
          />
          {!!(error || state.message) && (
            <HelperText
              type={error ? 'error' : 'info'}
              accessibilityRole="alert">
              {error || state.message}
            </HelperText>
          )}
          <Button
            mode="contained"
            buttonColor={colors.orange}
            textColor={colors.navy}
            icon="arrow-right"
            loading={busy}
            disabled={busy || !server.trim() || !login.trim() || !password}
            onPress={() => {
              void submit();
            }}>
            Entrar
          </Button>
          <Button
            disabled={busy}
            onPress={() => setConnectionSettings(value => !value)}>
            Configuração de conexão
          </Button>
          {connectionSettings && (
            <TextInput
              mode="outlined"
              label="Endereço da API"
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              keyboardType="url"
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.blue},
  content: {flexGrow: 1},
  welcome: {padding: 20, paddingBottom: 32, gap: 8},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 10},
  brandName: {fontSize: 22, lineHeight: 30, fontWeight: '700', color: 'white'},
  headline: {fontSize: 29, lineHeight: 37, fontWeight: '700', color: 'white'},
  description: {fontSize: 16, lineHeight: 24, color: '#E2E7FF'},
  form: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    padding: 20,
    gap: 12,
  },
  formHeading: {gap: 6, marginBottom: 4},
  formTitle: {fontWeight: '700', color: colors.navy},
  formDescription: {fontSize: 15, lineHeight: 23, color: colors.muted},
});
