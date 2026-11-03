import React from 'react';
import {render, screen, userEvent} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {Confirmation, RecoverySlots} from '../src/components/Nfc/SetupControls';

test('confirmation exposes a checkbox and a visible check mark on every platform', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  const view = await render(
    <PaperProvider>
      <Confirmation label="Autorizar" checked={false} onPress={onPress} />
    </PaperProvider>,
  );
  expect(screen.getByRole('checkbox', {name: 'Autorizar'})).not.toBeChecked();
  await user.press(screen.getByRole('checkbox', {name: 'Autorizar'}));
  expect(onPress).toHaveBeenCalledTimes(1);
  await view.rerender(
    <PaperProvider>
      <Confirmation label="Autorizar" checked onPress={onPress} />
    </PaperProvider>,
  );
  expect(screen.getByRole('checkbox', {name: 'Autorizar'})).toBeChecked();
});

test('compact recovery never selects an unknown key or silently replaces a known key', async () => {
  const onChange = jest.fn();
  await render(
    <PaperProvider>
      <RecoverySlots
        materials={[null, 'ATUAL', 'ALVO', 'ATUAL', 'ALVO']}
        onChange={onChange}
      />
    </PaperProvider>,
  );
  expect(screen.getAllByRole('radio')).toHaveLength(10);
  expect(screen.getByRole('radio', {name: 'Chave 0: Atual'})).not.toBeChecked();
  expect(screen.getByRole('radio', {name: 'Chave 0: Alvo'})).not.toBeChecked();
  expect(screen.getByRole('radio', {name: 'Chave 1: Atual'})).toBeChecked();
  expect(screen.getByRole('radio', {name: 'Chave 2: Alvo'})).toBeChecked();
  expect(onChange).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('radio', {name: 'Chave 0: Alvo'}));
  expect(onChange).toHaveBeenCalledWith(0, 'ALVO');
});
