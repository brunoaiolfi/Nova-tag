import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, TouchableRipple} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Navigator from '../src/navigation';

jest.mock('../src/components/Auth/SessionProvider', () => ({
  useSession: () => ({
    state: {
      status: 'authenticated',
      session: {user: {perfil: 'ADMINISTRADOR'}},
    },
  }),
}));
jest.mock('../src/views/Home', () => 'HomeScreen');
jest.mock('../src/views/Historico', () => 'HistoryScreen');
jest.mock('../src/views/Envios', () => 'QueueScreen');
jest.mock('../src/navigation/EventosNavigator', () => 'EventsScreen');
jest.mock('../src/navigation/ProvisionarNavigator', () => 'ProvisionScreen');

test('mounts the custom tab bar inside React and navigates between authenticated tabs', async () => {
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <SafeAreaProvider>
        <PaperProvider>
          <Navigator />
        </PaperProvider>
      </SafeAreaProvider>,
    );
  });
  const tabs = () =>
    tree!.root
      .findAllByType(TouchableRipple)
      .filter(item => item.props.accessibilityRole === 'tab');
  expect(tabs().map(item => item.props.accessibilityLabel)).toEqual([
    'Início',
    'Rastreio',
    'Envios',
    'Registrar',
    'Vincular',
  ]);
  await act(async () =>
    tabs()
      .find(item => item.props.accessibilityLabel === 'Rastreio')!
      .props.onPress(),
  );
  expect(
    tabs().find(item => item.props.accessibilityState.selected)?.props
      .accessibilityLabel,
  ).toBe('Rastreio');
  await act(async () => tree!.unmount());
});
