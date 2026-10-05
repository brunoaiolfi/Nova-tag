import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Button, PaperProvider, TextInput} from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import Leitor from '../src/components/Nfc/Leitor';
import {SecureSessionStorage} from '../src/infra/auth/secure-session-storage';

test('preview accepts synthetic UID/NDEF and exposes simulated failure', async () => {
  const onRead = jest.fn();
  const onError = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <PaperProvider>
        <Leitor onLeituraRealizada={onRead} onErroLeitura={onError} />
      </PaperProvider>,
    );
  });
  const input = (label: string) =>
    tree.root.findAllByType(TextInput).find(x => x.props.label === label)!;
  const button = (label: string) =>
    tree.root.findAllByType(Button).find(x => x.props.children === label)!;
  await act(async () => {
    input('UID simulado').props.onChangeText('04:a1:b2:c3:d4:e5:f6');
    input('Texto NDEF simulado (opcional)').props.onChangeText('urn:teste');
  });
  await act(async () => button('Simular captura').props.onPress());
  expect(onRead).toHaveBeenCalledWith('04A1B2C3D4E5F6', 'urn:teste');
  await act(async () => input('UID simulado').props.onChangeText('not-a-tag'));
  expect(button('Simular captura').props.disabled).toBe(true);
  await act(async () => button('Simular falha').props.onPress());
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining('Falha simulada'),
  );
  await act(async () => tree.unmount());
});

test('SecureStore rejects malformed sessions and propagates storage failures', async () => {
  const storage = new SecureSessionStorage();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('not-json');
  await expect(storage.load()).rejects.toMatchObject({code: 'SESSAO_INVALIDA'});
  jest
    .mocked(SecureStore.getItemAsync)
    .mockResolvedValueOnce('{"token":"forged"}');
  await expect(storage.load()).rejects.toMatchObject({code: 'SESSAO_INVALIDA'});
  jest
    .mocked(SecureStore.deleteItemAsync)
    .mockRejectedValueOnce(new Error('locked'));
  await expect(storage.clear()).rejects.toThrow('locked');
});
