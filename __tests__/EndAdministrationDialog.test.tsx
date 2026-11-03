import React from 'react';
import {Dimensions} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {act, render, screen, userEvent} from '@testing-library/react-native';
import EndAdministrationDialog from '../src/views/Provisionar/Administracao/EndAdministrationDialog';

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await act(async () => jest.runOnlyPendingTimers());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test.each([
  {width: 320, height: 568, fontScale: 1},
  {width: 390, height: 844, fontScale: 1.5},
  {width: 667, height: 375, fontScale: 2},
])(
  'confirmation uses bounded scrolling and stacked actions at $width × $height with font scale $fontScale',
  async ({width, height, fontScale}) => {
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({width, height, scale: 2, fontScale});
    await render(
      <PaperProvider>
        <EndAdministrationDialog
          verified
          active
          onDismiss={jest.fn()}
          onConfirm={jest.fn()}
        />
      </PaperProvider>,
    );

    expect(screen.getByTestId('end-administration-dialog-surface')).toHaveStyle(
      {
        maxHeight: height - 32,
        borderRadius: 24,
      },
    );
    expect(
      screen.getByTestId('end-administration-dialog-surface-outer-layer'),
    ).toHaveStyle({
      width: Math.min(440, width - 32),
    });
    expect(screen.getByLabelText('Confirmação de encerramento')).toHaveStyle({
      flexShrink: 1,
      minHeight: 0,
    });
    expect(screen.getByTestId('end-administration-actions')).toHaveStyle({
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8,
    });
    expect(
      screen.getByRole('header', {name: 'Finalizar a administração?'}),
    ).toBeVisible();
    expect(
      screen.getByRole('button', {name: 'Confirmar encerramento'}),
    ).toBeEnabled();
    expect(screen.getByRole('button', {name: 'Voltar ao plano'})).toBeEnabled();
  },
);

test('the active-link confirmation preserves its explanation and separates returning from confirming', async () => {
  const onConfirm = jest.fn();
  const onDismiss = jest.fn();
  const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
  await render(
    <PaperProvider>
      <EndAdministrationDialog
        verified
        active
        onDismiss={onDismiss}
        onConfirm={onConfirm}
      />
    </PaperProvider>,
  );

  expect(
    screen.getByText(/A configuração e o vínculo ativo serão preservados/),
  ).toBeVisible();
  expect(
    screen.getByText('O plano e o diário permanecerão no histórico.'),
  ).toBeVisible();
  await user.press(screen.getByRole('button', {name: 'Voltar ao plano'}));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  await user.press(
    screen.getByRole('button', {name: 'Confirmar encerramento'}),
  );
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
