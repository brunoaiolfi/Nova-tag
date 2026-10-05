import React, {PropsWithChildren} from 'react';
import {ActivityIndicator, Button, Text} from 'react-native-paper';
import {View, StyleSheet} from 'react-native';
import {useSession} from './SessionProvider';
import Login from '../../views/Login';

export function SessionGate({children}: PropsWithChildren) {
  const {manager, state} = useSession();
  if (state.status === 'anonymous') {
    return <Login />;
  }
  const authenticated = state.status === 'authenticated';
  const preserve = authenticated || state.previouslyVerified === true;
  // Retain local work under an opaque, blocking overlay during revalidation.
  // A saved token alone never mounts the protected content on cold startup.
  if (preserve && state.session) {
    return (
      <View style={styles.root}>
        <View
          key={state.session.user.id}
          style={styles.root}
          pointerEvents={authenticated ? 'auto' : 'none'}
          accessibilityElementsHidden={!authenticated}
          importantForAccessibility={
            authenticated ? 'auto' : 'no-hide-descendants'
          }>
          {children}
        </View>
        {!authenticated && (
          <View style={[StyleSheet.absoluteFill, styles.overlay]}>
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
        )}
      </View>
    );
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
  root: {flex: 1},
  overlay: {
    backgroundColor: '#FAFAFA',
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  container: {flex: 1, padding: 24, justifyContent: 'center', gap: 16},
});
