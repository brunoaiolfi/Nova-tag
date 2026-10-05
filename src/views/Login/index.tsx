import {ActionButton as Button} from '../../components/Tracking';
import React, {useState} from 'react';
import {KeyboardAvoidingView, ScrollView, StyleSheet} from 'react-native';
import {HelperText, Text, TextInput} from 'react-native-paper';
import {useSession} from '../../components/Auth/SessionProvider';
import {defaultApiUrl} from '../../infra/auth/default-api-url';
import {PageHero} from '../../components/Tracking';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function Login() {
  const {manager, state} = useSession();
  const [server, setServer] = useState(defaultApiUrl);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connectionSettings, setConnectionSettings] = useState(!defaultApiUrl);
  const insets = useSafeAreaInsets();
  const submit = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await manager.login(server, login, password);
    } catch (failure) {
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom},
        ]}
        keyboardShouldPersistTaps="handled">
        <PageHero
          title="Do cadastro à entrega."
          description="Acompanhe cada etapa com a etiqueta NFC do pedido."
          icon="map-marker-path"
        />
        <Text variant="titleLarge">Entrar no Nova-tag</Text>
        <Text>Use sua conta do laboratório.</Text>
        <TextInput
          mode="outlined"
          label="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!busy}
        />
        <TextInput
          mode="outlined"
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          editable={!busy}
          onSubmitEditing={() => {
            void submit();
          }}
        />
        {!!(error || state.message) && (
          <HelperText type={error ? 'error' : 'info'} accessibilityRole="alert">
            {error || state.message}
          </HelperText>
        )}
        <Button
          mode="contained"
          loading={busy}
          disabled={busy || !login.trim() || !password}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F6FA'},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16},
});
