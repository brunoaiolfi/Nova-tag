import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider} from 'react-native-paper';
import Leitor from '../src/components/Nfc/Leitor';
import TagDetails from '../src/components/Nfc/TagDetails';
import {readPhysicalTag, cancelPhysicalRead} from '../src/infra/nfc/reader';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  readPhysicalTag: jest.fn(),
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
let tree: TestRenderer.ReactTestRenderer;
const read = jest.mocked(readPhysicalTag);
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
async function render() {
  const next = jest.fn();
  const error = jest.fn();
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Leitor onLeituraRealizada={next} onErroLeitura={error} />
      </PaperProvider>,
    );
  });
  return {next, error};
}
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  await act(async () => tree?.unmount());
});

test('keeps the scanned tag visible until explicit continuation and retains scan time', async () => {
  const {next} = await render();
  const reading = {uid: '53721F76950001', tecnologias: ['iso7816']};
  read.mockResolvedValueOnce(reading);
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  expect(next).not.toHaveBeenCalled();
  expect(tree.root.findByType(TagDetails).props.reading).toEqual(reading);
  const capturedAt = tree.root.findByType(TagDetails).props.capturedAt;
  expect(Date.parse(capturedAt)).not.toBeNaN();
  expect(JSON.stringify(tree.toJSON())).toContain('Leitura concluída');
  await act(async () => {
    button('Continuar com esta etiqueta').props.onPress();
  });
  expect(next).toHaveBeenCalledWith(reading, capturedAt);
});

test('a failed scan keeps the reader open and permits another attempt', async () => {
  const {next, error} = await render();
  read.mockRejectedValueOnce(new Error('Etiqueta fora de alcance'));
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  expect(error).toHaveBeenCalledWith('Etiqueta fora de alcance');
  expect(next).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Etiqueta fora de alcance');
  read.mockResolvedValueOnce({uid: '53721F76950001'});
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  expect(tree.root.findAllByType(TagDetails)).toHaveLength(1);
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Etiqueta fora de alcance',
  );
});

test('ignores a late NFC result after cancellation and blocks concurrent taps', async () => {
  const {next} = await render();
  let finish!: (reading: {uid: string}) => void;
  read.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await act(async () => {
    const press = button('Ler etiqueta').props.onPress;
    press();
    press();
  });
  expect(read).toHaveBeenCalledTimes(1);
  await act(async () => {
    button('Cancelar leitura').props.onPress();
    finish({uid: '53721F76950001'});
  });
  expect(cancelPhysicalRead).toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(TagDetails)).toHaveLength(0);
  expect(button('Ler etiqueta').props.disabled).toBe(false);
});
