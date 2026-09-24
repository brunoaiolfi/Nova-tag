import React, {PropsWithChildren} from 'react';
import {ActivityIndicator, Button, Text} from 'react-native-paper';
import {View, StyleSheet} from 'react-native';
import {useSession} from './SessionProvider';
import Login from '../../views/Login';

export function SessionGate({children}: PropsWithChildren) {
  const {manager, state} = useSession();
  if (state.status === 'authenticated') {
    return <>{children}</>;
  }
  if (state.status === 'anonymous') {
    return <Login />;
  }
  return (
    <View style={styles.container}>
      {state.status === 'checking' ? (
        <ActivityIndicator accessibilityLabel="Verificando sessão" />
      ) : (
        <>
          <Text accessibilityRole="alert">{state.message}</Text>
          <Button
            onPress={() => {
              void manager.restore();
            }}>
            Tentar novamente
          </Button>
          <Button
            onPress={() => {
              void manager.logout();
            }}>
            Sair desta sessão
          </Button>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, justifyContent: 'center', gap: 16},
});
