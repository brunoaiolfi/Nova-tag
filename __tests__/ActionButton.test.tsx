import React from 'react';
import {render, screen, userEvent} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {ActionButton} from '../src/components/ui/ActionButton';

test('button exposes its name and invokes a supported user interaction', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <PaperProvider>
      <ActionButton onPress={onPress}>Salvar captura</ActionButton>
    </PaperProvider>,
  );
  await user.press(screen.getByRole('button', {name: 'Salvar captura'}));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('busy button announces its state and prevents another command', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <PaperProvider>
      <ActionButton loading onPress={onPress}>
        Salvar captura
      </ActionButton>
    </PaperProvider>,
  );
  const button = screen.getByRole('button', {name: 'Salvar captura'});
  expect(button).toBeBusy();
  expect(button).toBeDisabled();
  await user.press(button);
  expect(onPress).not.toHaveBeenCalled();
});
