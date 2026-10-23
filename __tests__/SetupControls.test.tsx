import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Icon, PaperProvider, TouchableRipple} from 'react-native-paper';
import {Confirmation, RecoverySlots} from '../src/components/Nfc/SetupControls';

test('confirmation exposes a checkbox and a visible check mark on every platform', async () => {
  const onPress = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Confirmation label="Autorizar" checked={false} onPress={onPress} />
      </PaperProvider>,
    );
  });
  const control = () => tree.root.findByType(TouchableRipple);
  expect(control().props.accessibilityRole).toBe('checkbox');
  expect(control().props.accessibilityState.checked).toBe(false);
  await act(async () => control().props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  await act(async () =>
    tree.update(
      <PaperProvider>
        <Confirmation label="Autorizar" checked onPress={onPress} />
      </PaperProvider>,
    ),
  );
  expect(control().props.accessibilityState.checked).toBe(true);
  expect(tree.root.findByType(Icon).props.source).toBe('check');
  await act(async () => tree.unmount());
});

test('compact recovery never selects an unknown key or silently replaces a known key', async () => {
  const onChange = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <RecoverySlots
          materials={[null, 'ATUAL', 'ALVO', 'ATUAL', 'ALVO']}
          onChange={onChange}
        />
      </PaperProvider>,
    );
  });
  const choices = tree.root.findAllByType(TouchableRipple);
  expect(choices).toHaveLength(10);
  expect(
    choices.slice(0, 2).every(x => !x.props.accessibilityState.checked),
  ).toBe(true);
  expect(choices[2].props.accessibilityState.checked).toBe(true);
  expect(choices[5].props.accessibilityState.checked).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  await act(async () => choices[1].props.onPress());
  expect(onChange).toHaveBeenCalledWith(0, 'ALVO');
  await act(async () => tree.unmount());
});
