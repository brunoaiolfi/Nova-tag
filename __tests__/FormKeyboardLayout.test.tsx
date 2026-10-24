import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {KeyboardAvoidingView, Platform, Text} from 'react-native';
import {HeaderHeightContext} from '@react-navigation/elements';
import Tela from '../src/components/Base/Tela';

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
afterEach(() => jest.restoreAllMocks());
test.each([
  ['ios', 'padding'],
  ['android', 'height'],
] as const)(
  '%s form layout accounts for the native header above the keyboard',
  async (platform, behavior) => {
    jest.replaceProperty(Platform, 'OS', platform);
    await render(
      <HeaderHeightContext.Provider value={64}>
        <Tela keyboard scroll>
          <Text>Form</Text>
        </Tela>
      </HeaderHeightContext.Provider>,
    );
    expect(screen.getByText('Form')).toBeVisible();
    expect(mockKeyboardProps).toMatchObject({
      enabled: true,
      behavior,
      keyboardVerticalOffset: 64,
    });
  },
);
