import {ActionButton as Button} from '../src/components/Tracking';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {PaperProvider, Text, TextInput} from 'react-native-paper';
import {SessionProvider} from '../src/components/Auth/SessionProvider';
import {SessionGate} from '../src/components/Auth/SessionGate';
import {SessionManager} from '../src/appplication/auth/session-manager';
import {SessionError, Transport} from '../src/domain/auth/types';
import {defaultApiUrl} from '../src/infra/auth/default-api-url';

jest.mock('../src/infra/auth/default-api-url', () => ({
  defaultApiUrl: jest.fn(),
}));

describe('Login and session gate UI', () => {
  let tree: TestRenderer.ReactTestRenderer;
  beforeEach(() => {
    jest.mocked(defaultApiUrl).mockReturnValue('http://127.0.0.1:3000/api/v1');
  });
  afterEach(async () => {
    if (tree) {
      await act(async () => tree.unmount());
    }
  });
  async function render() {
    const storage = {
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const send = jest.fn();
    const manager = new SessionManager(storage, {send} as Transport, true);
    await act(async () => {
      tree = TestRenderer.create(
        <PaperProvider>
          <SessionProvider manager={manager}>
            <SessionGate>
              <Text>Área autenticada</Text>
            </SessionGate>
          </SessionProvider>
        </PaperProvider>,
      );
    });
    return {manager, send, storage};
  }
  const input = (label: string) =>
    tree.root.findAllByType(TextInput).find(x => x.props.label === label)!;
  const enter = () =>
    tree.root.findAllByType(Button).find(x => x.props.children === 'Entrar')!;
  it('shows connection settings and blocks login when no API address is configured', async () => {
    jest.mocked(defaultApiUrl).mockReturnValue('');
    await render();
    expect(input('Endereço da API').props.value).toBe('');
    await act(async () => {
      input('Login').props.onChangeText('operador.lab');
      input('Senha').props.onChangeText('laboratorio-password');
    });
    expect(enter().props.disabled).toBe(true);
    await act(async () => {
      input('Endereço da API').props.onChangeText(
        'http://127.0.0.1:3000/api/v1',
      );
    });
    expect(enter().props.disabled).toBe(false);
  });
  it('opens connection settings when the configured API URL is invalid without sending credentials', async () => {
    jest.mocked(defaultApiUrl).mockReturnValue('invalid-server');
    const {send} = await render();
    await act(async () => {
      input('Login').props.onChangeText('operador.lab');
      input('Senha').props.onChangeText('laboratorio-password');
    });
    await act(async () => {
      enter().props.onPress();
    });
    expect(input('Endereço da API').props.value).toBe('invalid-server');
    expect(input('Senha').props.value).toBe('');
    expect(send).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
  });
  it('requires login before rendering protected content and clears the password after login', async () => {
    const {send, storage, manager} = await render();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
    expect(enter().props.disabled).toBe(true);
    await act(async () => {
      input('Login').props.onChangeText('operador.lab');
      input('Senha').props.onChangeText('laboratorio-password');
    });
    send.mockResolvedValueOnce({
      tokenAcesso: 'nfc_' + 'a'.repeat(43),
      expiraEm: new Date(Date.now() + 3600000).toISOString(),
      usuario: {
        id: 'operator',
        login: 'operador.lab',
        nome: 'Operador',
        perfil: 'OPERADOR',
      },
    });
    await act(async () => {
      enter().props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Área autenticada');
    expect(storage.save).toHaveBeenCalledTimes(1);
    send.mockResolvedValueOnce({encerrada: true});
    await act(async () => {
      await manager.logout();
    });
    expect(input('Senha').props.value).toBe('');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
  });
  it('displays invalid credentials without revealing protected content or persisting a session', async () => {
    const {send, storage} = await render();
    await act(async () => {
      input('Login').props.onChangeText('operador.lab');
      input('Senha').props.onChangeText('incorrect');
    });
    send.mockRejectedValueOnce(
      new SessionError(
        'CREDENCIAIS_INVALIDAS',
        'Login ou senha inválidos.',
        401,
      ),
    );
    await act(async () => {
      enter().props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      'Login ou senha inválidos.',
    );
    expect(input('Senha').props.value).toBe('');
    expect(storage.save).not.toHaveBeenCalled();
  });
});
