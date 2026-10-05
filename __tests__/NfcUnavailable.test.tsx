import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Button, PaperProvider} from 'react-native-paper';
import Leitor from '../src/components/Nfc/Leitor';
import {SecureSessionStorage} from '../src/infra/auth/secure-session-storage';
import * as SecureStore from 'expo-secure-store';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {executionEnvironment: 'storeClient'},
  ExecutionEnvironment: {StoreClient: 'storeClient'},
}));
test('Expo Go prevents physical operations without importing native NFC', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Leitor onLeituraRealizada={jest.fn()} onErroLeitura={jest.fn()} />
      </PaperProvider>,
    );
  });
  expect(
    tree.root
      .findAllByType(Button)
      .find(button => button.props.children === 'Ler etiqueta')?.props.disabled,
  ).toBe(true);
  await act(async () => tree.unmount());
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
