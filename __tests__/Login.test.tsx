import {createTestServices, withServices} from '../test-support/app-services';

import React from 'react';
import {
  render as renderProbe,
  act,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {KeyboardAvoidingView, Platform} from 'react-native';
import {PaperProvider, Text} from 'react-native-paper';
import {SessionProvider} from '../src/components/Auth/SessionProvider';
import {SessionGate} from '../src/components/Auth/SessionGate';
import {SessionManager} from '../src/appplication/auth/session-manager';
import {SessionError} from '../src/appplication/auth/session-error';
import {Transport} from '../src/appplication/auth/ports/transport';
import {defaultApiUrl} from '../src/infra/auth/default-api-url';

jest.mock('../src/infra/auth/default-api-url', () => ({
  defaultApiUrl: jest.fn(),
}));
const services = createTestServices({});

let mockKeyboardProps: Partial<
  React.ComponentProps<typeof KeyboardAvoidingView>
>;
jest.mock(
  'react-native/Libraries/Components/Keyboard/KeyboardAvoidingView',
  () => {
    const ReactRuntime = require('react');
    const View = require('react-native').View;
    return {
      __esModule: true,
      default: ({
        children,
        ...props
      }: React.ComponentProps<typeof KeyboardAvoidingView>) => {
        mockKeyboardProps = props;
        return ReactRuntime.createElement(View, null, children);
      },
    };
  },
);

describe('Login and session gate UI', () => {
  let tree: RenderResult;
  beforeEach(() => {
    jest.mocked(defaultApiUrl).mockReturnValue('http://127.0.0.1:3000/api/v1');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('a session beyond the native timer limit expires on its date without overflowing or expiring early', async () => {
    jest.useFakeTimers();
    const {manager, send} = await render();
    const lifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
    send.mockResolvedValueOnce({
      tokenAcesso: 'nfc_' + 'a'.repeat(43),
      expiraEm: new Date(Date.now() + lifetimeMilliseconds).toISOString(),
      usuario: {
        id: 'admin',
        login: 'admin',
        nome: 'Administrador',
        perfil: 'ADMINISTRADOR',
      },
    });
    await act(async () =>
      manager.login('http://127.0.0.1:3000/api/v1', 'admin', 'fixture'),
    );
    await act(async () => jest.advanceTimersByTime(2147483647));
    expect(manager.getSnapshot().status).toBe('authenticated');
    await act(async () =>
      jest.advanceTimersByTime(lifetimeMilliseconds - 2147483647),
    );
    expect(manager.getSnapshot().status).toBe('anonymous');
  });

  test.each([
    ['ios', 'padding'],
    ['android', 'height'],
  ] as const)(
    '%s login keeps the labeled form inside the platform keyboard adapter',
    async (platform, behavior) => {
      jest.replaceProperty(Platform, 'OS', platform);
      await render();
      expect(input('Login')).toBeOnTheScreen();
      expect(input('Senha')).toBeOnTheScreen();
      expect(mockKeyboardProps.behavior).toBe(behavior);
    },
  );

  async function render() {
    const storage = {
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const send = jest.fn();
    const manager = new SessionManager(storage, {send} as Transport, true);
    tree = await renderProbe(
      withServices(
        <PaperProvider>
          <SessionProvider manager={manager}>
            <SessionGate>
              <Text>Área autenticada</Text>
            </SessionGate>
          </SessionProvider>
        </PaperProvider>,
        services,
      ),
    );
    return {manager, send, storage};
  }
  const input = (label: string) => screen.getByLabelText(label);
  const enter = () => screen.getByRole('button', {name: 'Entrar'});
  it('shows connection settings and blocks login when no API address is configured', async () => {
    jest.mocked(defaultApiUrl).mockReturnValue('');
    await render();
    expect(input('Endereço da API')).toHaveDisplayValue('');

    await fireEvent.changeText(input('Login'), 'operador.lab');
    await fireEvent.changeText(input('Senha'), 'laboratorio-password');

    expect(enter()).toBeDisabled();

    await fireEvent.changeText(
      input('Endereço da API'),
      'http://127.0.0.1:3000/api/v1',
    );

    expect(enter()).toBeEnabled();
  });
  it('opens connection settings when the configured API URL is invalid without sending credentials', async () => {
    jest.mocked(defaultApiUrl).mockReturnValue('invalid-server');
    const {send} = await render();

    await fireEvent.changeText(input('Login'), 'operador.lab');
    await fireEvent.changeText(input('Senha'), 'laboratorio-password');

    await fireEvent.press(enter());

    expect(input('Endereço da API')).toHaveDisplayValue('invalid-server');
    expect(input('Senha')).toHaveDisplayValue('');
    expect(send).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
  });
  it('requires login before rendering protected content and clears the password after login', async () => {
    const {send, storage, manager} = await render();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
    expect(enter()).toBeDisabled();

    await fireEvent.changeText(input('Login'), 'operador.lab');
    await fireEvent.changeText(input('Senha'), 'laboratorio-password');

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

    await fireEvent.press(enter());

    expect(JSON.stringify(tree.toJSON())).toContain('Área autenticada');
    expect(storage.save).toHaveBeenCalledTimes(1);
    send.mockResolvedValueOnce({encerrada: true});
    await act(async () => {
      await manager.logout();
    });
    expect(input('Senha')).toHaveDisplayValue('');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Área autenticada');
  });
  it('displays invalid credentials without revealing protected content or persisting a session', async () => {
    const {send, storage} = await render();

    await fireEvent.changeText(input('Login'), 'operador.lab');
    await fireEvent.changeText(input('Senha'), 'incorrect');

    send.mockRejectedValueOnce(
      new SessionError(
        'CREDENCIAIS_INVALIDAS',
        'Login ou senha inválidos.',
        401,
      ),
    );

    await fireEvent.press(enter());

    expect(JSON.stringify(tree.toJSON())).toContain(
      'Login ou senha inválidos.',
    );
    expect(input('Senha')).toHaveDisplayValue('');
    expect(storage.save).not.toHaveBeenCalled();
  });
});
