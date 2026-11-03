import {createTestServices, withServices} from '../test-support/app-services';
import React from 'react';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {Dimensions} from 'react-native';
import {PaperProvider} from 'react-native-paper';
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
const services = createTestServices({});

afterEach(() => jest.restoreAllMocks());

test.each([
  [320, 1],
  [375, 1],
  [393, 1.2],
  [411, 2],
])(
  'all five tabs stay in one row at width %s and font scale %s',
  async (width, fontScale) => {
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({width, height: 900, scale: 2.625, fontScale});
    await renderProbe(
      withServices(
        <PaperProvider>
          <Navigator />
        </PaperProvider>,
        services,
      ),
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(screen.getByTestId('main-tab-bar')).toHaveStyle({
      flexDirection: 'row',
      flexWrap: 'nowrap',
    });
    for (const tab of tabs) {
      expect(tab).toHaveStyle({flex: 1, minWidth: 0});
    }
    for (const label of [
      'Início',
      'Rastreio',
      'Envios',
      'Registrar',
      'Vincular',
    ]) {
      expect(screen.getByText(label)).toHaveProp('numberOfLines', 1);
    }
    await fireEvent.press(screen.getByRole('tab', {name: 'Vincular'}));
    expect(screen.getByRole('tab', {name: 'Vincular'})).toBeSelected();
    expect(screen.getByText('Registrar')).toBeOnTheScreen();
  },
);

test('mounts the custom tab bar inside React and navigates between authenticated tabs', async () => {
  let tree: RenderResult;
  tree = await renderProbe(
    withServices(
      <SafeAreaProvider>
        <PaperProvider>
          <Navigator />
        </PaperProvider>
      </SafeAreaProvider>,
      services,
    ),
  );
  const tabs = () => screen.getAllByRole('tab');
  expect(tabs().map(item => item.props.accessibilityLabel)).toEqual([
    'Início',
    'Rastreio',
    'Envios',
    'Registrar',
    'Vincular',
  ]);
  await fireEvent.press(
    tabs().find(item => item.props.accessibilityLabel === 'Rastreio')!,
  );
  expect(
    tabs().find(item => item.props.accessibilityState.selected)?.props
      .accessibilityLabel,
  ).toBe('Rastreio');
  await act(async () => tree!.unmount());
});
