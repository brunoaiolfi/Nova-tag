import {createTestServices, withServices} from '../test-support/app-services';

import React from 'react';
import {render as renderProbe, screen} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import Leitor from '../src/components/Nfc/Leitor';
import {SecureSessionStorage} from '../src/infra/auth/secure-session-storage';
import * as SecureStore from 'expo-secure-store';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {executionEnvironment: 'storeClient'},
  ExecutionEnvironment: {StoreClient: 'storeClient'},
}));
const services = createTestServices({});

test('Expo Go prevents physical operations without importing native NFC', async () => {
  let tree!: RenderResult;
  tree = await renderProbe(
    withServices(
      <PaperProvider>
        <Leitor onLeituraRealizada={jest.fn()} onErroLeitura={jest.fn()} />
      </PaperProvider>,
      services,
    ),
  );
  expect(screen.getByRole('button', {name: 'Ler etiqueta'})).toBeDisabled();
  await tree.unmount();
});
test('SecureStore rejects malformed sessions and propagates errors', async () => {
  const storage = new SecureSessionStorage();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('not-json');
  await expect(storage.load()).rejects.toMatchObject({code: 'SESSAO_INVALIDA'});
  jest
    .mocked(SecureStore.deleteItemAsync)
    .mockRejectedValueOnce(new Error('locked'));
  await expect(storage.clear()).rejects.toThrow('locked');
});
