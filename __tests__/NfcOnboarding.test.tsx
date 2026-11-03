import {requiredItem} from '../test-support/required-item';
import {createTestServices, withServices} from '../test-support/app-services';

import React from 'react';
import {
  render as renderProbe,
  screen,
  fireEvent,
  act,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import Leitor from '../src/components/Nfc/Leitor';
import {readPhysicalTag, cancelPhysicalRead} from '../src/infra/nfc/reader';

import type {Attempt} from '../src/domain/experimentation/attempt';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  readPhysicalTag: jest.fn(),
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
const services = createTestServices({});
const {experiment: experimentJournal} = services;

let tree: RenderResult;
const read = jest.mocked(readPhysicalTag);
const button = (label: string) => screen.getByRole('button', {name: label});
async function render(experimentType?: string) {
  const next = jest.fn();
  const error = jest.fn();
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <Leitor
          onLeituraRealizada={next}
          onErroLeitura={error}
          experimentType={experimentType}
        />
      </PaperProvider>,
      services,
    ),
  );
  return {next, error};
}
beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('keeps the scanned tag visible until explicit continuation and retains scan time', async () => {
  const {next} = await render();
  const reading = {uid: '53721F76950001', tecnologias: ['iso7816']};
  read.mockResolvedValueOnce(reading);

  await fireEvent.press(button('Ler etiqueta'));

  expect(next).not.toHaveBeenCalled();
  expect(screen.getByText('53:72:1F:76:95:00:01')).toBeVisible();
  const scanFinished = Date.now();
  expect(JSON.stringify(tree.toJSON())).toContain('Etiqueta lida');

  await fireEvent.press(button('Continuar'));

  expect(next).toHaveBeenCalledWith(reading, expect.any(String), null);
  const capturedAt = Date.parse(requiredItem(next.mock.calls, 0)[1]);
  expect(Number.isFinite(capturedAt)).toBe(true);
  expect(capturedAt).toBeLessThanOrEqual(scanFinished);
});

test('a failed scan keeps the reader open and permits another attempt', async () => {
  const {next, error} = await render();
  read.mockRejectedValueOnce(new Error('Etiqueta fora de alcance'));

  await fireEvent.press(button('Ler etiqueta'));

  expect(error).toHaveBeenCalledWith('Etiqueta fora de alcance');
  expect(next).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Etiqueta fora de alcance');
  read.mockResolvedValueOnce({uid: '53721F76950001'});

  await fireEvent.press(button('Ler etiqueta'));

  expect(screen.getByText('Etiqueta encontrada')).toBeVisible();
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

  const control = button('Ler etiqueta');
  await fireEvent.press(control);
  await fireEvent.press(control);

  expect(read).toHaveBeenCalledTimes(1);

  await fireEvent.press(button('Cancelar leitura'));
  await act(async () => finish({uid: '53721F76950001'}));

  expect(cancelPhysicalRead).toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
  expect(screen.queryByText('Etiqueta encontrada')).not.toBeOnTheScreen();
  expect(button('Ler etiqueta')).toBeEnabled();
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

  await fireEvent.press(button('Ler etiqueta'));

  expect(read).not.toHaveBeenCalled();

  await fireEvent.press(button('Cancelar leitura'));
  await act(async () => resolve(attempt));

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

  await fireEvent.press(button('Ler etiqueta'));

  expect(finish).toHaveBeenCalledWith(
    attempt,
    expect.any(Number),
    false,
    'NFC_TIMEOUT',
  );
  expect(next).not.toHaveBeenCalled();
  expect(screen.queryByText('Etiqueta encontrada')).not.toBeOnTheScreen();
});
