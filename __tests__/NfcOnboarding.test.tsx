import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider} from 'react-native-paper';
import Leitor from '../src/components/Nfc/Leitor';
import TagDetails from '../src/components/Nfc/TagDetails';
import {readPhysicalTag, cancelPhysicalRead} from '../src/infra/nfc/reader';
import {experimentJournal} from '../src/infra/offline/runtime';
import type {Attempt} from '../src/domain/experimentation/types';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  readPhysicalTag: jest.fn(),
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
let tree: TestRenderer.ReactTestRenderer;
const read = jest.mocked(readPhysicalTag);
const button = (label: string) =>
  tree.root.findAllByType(Button).find(item => item.props.children === label)!;
async function render(experimentType?: string) {
  const next = jest.fn();
  const error = jest.fn();
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Leitor
          onLeituraRealizada={next}
          onErroLeitura={error}
          experimentType={experimentType}
        />
      </PaperProvider>,
    );
  });
  return {next, error};
}
beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
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
  expect(next).toHaveBeenCalledWith(reading, capturedAt, null);
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
test('does not start NFC until the experimental beginning has committed, and does not read after cancellation during that commit', async () => {
  let resolve!: (value: Attempt | null) => void;
  const attempt = {
    id: 'attempt',
    owner: {userId: 'operator', baseUrl: 'http://localhost'},
    plan: {timeoutMs: 1000},
  } as Attempt;
  jest.spyOn(experimentJournal, 'start').mockImplementation(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  const finish = jest.spyOn(experimentJournal, 'finish').mockResolvedValue();
  await render('COLETA');
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  expect(read).not.toHaveBeenCalled();
  await act(async () => {
    button('Cancelar leitura').props.onPress();
    resolve(attempt);
  });
  expect(read).not.toHaveBeenCalled();
  expect(finish).toHaveBeenCalledWith(
    attempt,
    expect.any(Number),
    false,
    'NFC_CANCELADO',
  );
});
test('records native NFC timeout without exposing a successful result or dropping the experiment context', async () => {
  const attempt = {
    id: 'attempt',
    owner: {userId: 'operator', baseUrl: 'http://localhost'},
    plan: {timeoutMs: 1000},
  } as Attempt;
  jest.spyOn(experimentJournal, 'start').mockResolvedValue(attempt);
  const finish = jest.spyOn(experimentJournal, 'finish').mockResolvedValue();
  read.mockRejectedValue(
    Object.assign(new Error('Tempo esgotado'), {code: 'NFC_TIMEOUT'}),
  );
  const {next} = await render('COLETA');
  await act(async () => {
    button('Ler etiqueta').props.onPress();
  });
  expect(finish).toHaveBeenCalledWith(
    attempt,
    expect.any(Number),
    false,
    'NFC_TIMEOUT',
  );
  expect(next).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(TagDetails)).toHaveLength(0);
});
