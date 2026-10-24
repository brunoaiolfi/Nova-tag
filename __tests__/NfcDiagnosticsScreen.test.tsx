import {renderedText} from '../test-support/rendered-text';
import {createTestServices, withServices} from '../test-support/app-services';
import React from 'react';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {Share} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import Diagnostico from '../src/views/Provisionar/Diagnostico';

import {ndefFileSettings} from '../src/domain/nfc/file-settings';
import {createSdmBenchPlan} from '../src/domain/nfc/sdm-profile';
import {cancelPhysicalRead} from '../src/infra/nfc/reader';
import {
  diagnosePhysicalTag,
  diagnosticJson,
  PhysicalTagReport,
} from '../src/infra/nfc/diagnostics';

jest.mock('../src/infra/nfc/reader', () => ({
  physicalNfcAvailable: true,
  cancelPhysicalRead: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/infra/nfc/diagnostics', () => ({
  ...jest.requireActual('../src/infra/nfc/diagnostics'),
  diagnosePhysicalTag: jest.fn(),
}));
const services = createTestServices({});

const fixture: PhysicalTagReport = {
  reportVersion: 2,
  capturedAt: '2026-10-06T12:00:00.000Z',
  uid: '53721F76950001',
  technologies: ['IsoDep'],
  device: {
    platform: 'ios',
    osVersion: '26',
    appVersion: '0.2.0',
    nativeBuild: '2',
  },
  exchanges: [{commandHex: '9060000000', responseHex: '6D00'}],
  version: {issue: 'Comando não suportado.', code: 'NFC_UNSUPPORTED_TAG'},
  ndef: {
    file: {
      fileId: 0xe104,
      maximumFileSize: 256,
      maximumReadSize: 255,
      readAccess: 0,
      writeAccess: 0,
    },
    bytes: [],
  },
  uidMatchesProduction: null,
  fileSettings: {issue: 'Modelo não confirmado; permissões não consultadas.'},
};
let tree: RenderResult;
const button = (label: string) => screen.getByRole('button', {name: label});
const text = () => renderedText(tree);
async function mount() {
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <Diagnostico />
      </PaperProvider>,
      services,
    ),
  );
}
afterEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('scan is explicit, unknown hardware stays visible and sharing uses original evidence', async () => {
  jest.mocked(diagnosePhysicalTag).mockResolvedValue(fixture);
  jest.spyOn(Share, 'share').mockResolvedValue({action: Share.sharedAction});
  await mount();
  expect(diagnosePhysicalTag).not.toHaveBeenCalled();

  await fireEvent.press(button('Diagnosticar'));

  expect(text()).toContain('NTAG 424 DNA não confirmada');
  expect(text()).toContain(fixture.uid);
  expect(text()).toContain('A mensagem NDEF está vazia');

  await fireEvent.press(screen.getByText('Dados técnicos da consulta'));

  expect(text()).toContain('9060000000');

  await fireEvent.press(button('Compartilhar diagnóstico'));

  expect(Share.share).toHaveBeenCalledWith({
    title: 'Diagnóstico NFC Nova-tag',
    message: diagnosticJson(fixture),
  });
  const exported = JSON.parse(diagnosticJson(fixture));
  expect(exported.ndef.messageHex).toBe('');
  expect(exported.ndef.bytes).toBeUndefined();
  expect(text()).toContain(fixture.uid);
});

test('a failed second scan preserves the previous dated result and shows the error', async () => {
  jest
    .mocked(diagnosePhysicalTag)
    .mockResolvedValueOnce(fixture)
    .mockRejectedValueOnce(new Error('Conexão perdida'));
  await mount();

  await fireEvent.press(button('Diagnosticar'));

  await fireEvent.press(button('Outra etiqueta'));

  expect(text()).toContain('Conexão perdida');
  expect(text()).toContain(fixture.uid);
  expect(button('Outra etiqueta')).toBeEnabled();
});

test('native permissions remain declarations and never mark SDM or protection as verified', async () => {
  const plan = createSdmBenchPlan('11111111-2222-4333-8444-555555555555');
  jest.mocked(diagnosePhysicalTag).mockResolvedValue({
    ...fixture,
    fileSettings: {value: plan.expectedSettings},
  });
  await mount();

  await fireEvent.press(button('Diagnosticar'));

  expect(text()).toContain('As rotas de escrita disponíveis exigem chave');
  expect(text()).toContain('SDM declarado como habilitado');
  expect(text()).toContain('Isso não verifica a mensagem');
  expect(text()).toContain('confirmada em bancada');

  await fireEvent.press(screen.getByText('Dados técnicos da consulta'));

  expect(text()).toContain(plan.expectedSettings.rawHex);
  const exported = JSON.parse(
    diagnosticJson({...fixture, fileSettings: {value: plan.expectedSettings}}),
  );
  expect(exported.reportVersion).toBe(2);
  expect(exported.fileSettings.value.sdm.macInputOffset).toBe(7);
});

test('a free ReadWrite path is visible even when the Write permission requires a key', async () => {
  const value = ndefFileSettings([0, 0, 0xe0, 0xe0, 0, 1, 0]);
  jest
    .mocked(diagnosePhysicalTag)
    .mockResolvedValue({...fixture, fileSettings: {value}});
  await mount();

  await fireEvent.press(button('Diagnosticar'));

  expect(text()).toContain('uma rota de escrita livre');
  expect(text()).toContain('SDM declarado como desabilitado');
});

test('an older report retained by Fast Refresh remains readable without native settings', async () => {
  const oldReport = {
    ...fixture,
    reportVersion: 1,
    fileSettings: undefined,
  } as unknown as PhysicalTagReport;
  jest.mocked(diagnosePhysicalTag).mockResolvedValue(oldReport);
  await mount();

  await fireEvent.press(button('Diagnosticar'));

  expect(text()).toContain(fixture.uid);
  expect(text()).toContain('Permissões nativas não disponíveis');
  expect(text()).toContain('A mensagem NDEF está vazia');
});

test('leaving an active diagnosis cancels it and discards its late result', async () => {
  let resolve!: (value: PhysicalTagReport) => void;
  jest.mocked(diagnosePhysicalTag).mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  await mount();

  await fireEvent.press(button('Diagnosticar'));

  expect(button('Diagnosticar')).toBeDisabled();
  await act(async () => {
    await tree.unmount();
  });
  expect(cancelPhysicalRead).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve(fixture);
  });
});
