import React, {useState} from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, RadioButton, TextInput} from 'react-native-paper';
import ModelSelect from '../src/components/Nfc/ModelSelect';
import {ActionButton} from '../src/components/Tracking';

test('external preset changes replace an earlier custom editing mode', async () => {
  let setModel!: React.Dispatch<React.SetStateAction<string>>;
  function Form() {
    const [model, updateModel] = useState('DESCONHECIDO');
    setModel = updateModel;
    return (
      <ModelSelect value={model} onChange={updateModel} disabled={false} />
    );
  }
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Form />
      </PaperProvider>,
    );
  });
  await act(async () => tree.root.findByType(ActionButton).props.onPress());
  await act(async () =>
    tree.root
      .findAllByType(RadioButton.Item)
      .find(item => item.props.value === 'OUTRO')!
      .props.onPress(),
  );
  await act(async () =>
    tree.root.findByType(TextInput).props.onChangeText('Custom chip'),
  );
  expect(tree.root.findByType(TextInput).props.value).toBe('Custom chip');
  await act(async () => setModel('NTAG213'));
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(
    tree.root
      .findAllByType(RadioButton.Item)
      .find(item => item.props.value === 'NTAG213')!.props.status,
  ).toBe('checked');
  await act(async () => tree.unmount());
});
