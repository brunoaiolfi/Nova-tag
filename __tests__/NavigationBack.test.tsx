import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, TouchableRipple} from 'react-native-paper';
import {stackScreenOptions} from '../src/navigation/stack-screen-options';
import {tema} from '../src/theme';

test('the header returns through navigation using a clear Portuguese control', async () => {
  const goBack = jest.fn();
  const options = stackScreenOptions(tema, {goBack});
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        {options.headerLeft!({
          canGoBack: true,
          tintColor: tema.colors.onPrimary,
        })}
      </PaperProvider>,
    );
  });
  const control = tree!.root.findByType(TouchableRipple);
  expect(control.props.accessibilityLabel).toBe('Voltar');
  await act(async () => control.props.onPress());
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(async () => tree!.unmount());
});

test('the first screen does not offer an unavailable back action', () => {
  const goBack = jest.fn();
  const options = stackScreenOptions(tema, {goBack});
  expect(options.headerLeft!({canGoBack: false})).toBeNull();
  expect(goBack).not.toHaveBeenCalled();
});
