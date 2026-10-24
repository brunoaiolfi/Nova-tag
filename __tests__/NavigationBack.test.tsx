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
import {stackScreenOptions} from '../src/navigation/stack-screen-options';
import {tema} from '../src/theme';
const services = createTestServices({});

afterEach(() => jest.restoreAllMocks());

test('large fonts keep a named back action and leave room for the native header title', async () => {
  jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({width: 411, height: 900, scale: 2.625, fontScale: 2});
  const goBack = jest.fn();
  const options = stackScreenOptions(tema, {goBack});
  await renderProbe(
    <PaperProvider>{options.headerLeft!({canGoBack: true})}</PaperProvider>,
  );
  const control = screen.getByRole('button', {name: 'Voltar'});
  expect(screen.queryByText('Voltar')).not.toBeOnTheScreen();
  expect(control).toHaveStyle({minWidth: 44, minHeight: 44});
  await fireEvent.press(control);
  expect(goBack).toHaveBeenCalledTimes(1);
});

test('the header returns through navigation using a clear Portuguese control', async () => {
  const goBack = jest.fn();
  const options = stackScreenOptions(tema, {goBack});
  let tree: RenderResult;
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        {options.headerLeft!({
          canGoBack: true,
          tintColor: tema.colors.onPrimary,
        })}
      </PaperProvider>,
      services,
    ),
  );
  const control = screen.getByRole('button', {name: 'Voltar'});
  expect(control.props.accessibilityLabel).toBe('Voltar');
  await fireEvent.press(control);
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(async () => tree!.unmount());
});

test('the first screen does not offer an unavailable back action', () => {
  const goBack = jest.fn();
  const options = stackScreenOptions(tema, {goBack});
  expect(options.headerLeft!({canGoBack: false})).toBeNull();
  expect(goBack).not.toHaveBeenCalled();
});
