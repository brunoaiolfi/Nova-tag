import React, {useState} from 'react';
import {KeyboardAvoidingView, ScrollView, StyleSheet} from 'react-native';
import {Button, HelperText, Text, TextInput} from 'react-native-paper';
import {useSession} from '../../components/Auth/SessionProvider';

export default function Login() {
  const {manager, state} = useSession();
  const [server, setServer] = useState('http://127.0.0.1:3000/api/v1');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium">Entrar no Nova-tag</Text>
        <Text>Use sua conta do laboratório.</Text>
        <TextInput
          label="Endereço da API"
          value={server}
          onChangeText={setServer}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          keyboardType="url"
        />
        <TextInput
          label="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!busy}
        />
        <TextInput
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16},
});
