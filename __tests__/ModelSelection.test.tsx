import React, {useState} from 'react';
import {act, render, screen, userEvent} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import ModelSelect from '../src/components/Nfc/ModelSelect';

test('external preset changes replace an earlier custom editing mode', async () => {
  let setModel!: React.Dispatch<React.SetStateAction<string>>;
  function Form() {
    const [model, updateModel] = useState('DESCONHECIDO');
    setModel = updateModel;
    return (
      <ModelSelect value={model} onChange={updateModel} disabled={false} />
    );
  }
  await render(
    <PaperProvider>
      <Form />
    </PaperProvider>,
  );
  await userEvent.press(screen.getByRole('button', {name: 'Escolher modelo'}));
  await userEvent.press(
    screen.getByRole('radio', {name: 'Outro modelo conhecido'}),
  );
  await userEvent.type(
    screen.getByLabelText('Nome do modelo conhecido'),
    'Custom chip',
  );
  expect(screen.getByLabelText('Nome do modelo conhecido')).toHaveDisplayValue(
    'Custom chip',
  );
  await act(async () => setModel('NTAG213'));
  expect(
    screen.queryByLabelText('Nome do modelo conhecido'),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole('radio', {name: 'NTAG213'})).toBeChecked();
});
