import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {KeyboardAvoidingView, Platform, Text} from 'react-native';
import {HeaderHeightContext} from '@react-navigation/elements';
import Tela from '../src/components/Base/Tela';

afterEach(() => jest.restoreAllMocks());
test.each([
  ['ios', 'padding'],
  ['android', 'height'],
] as const)(
  '%s form layout accounts for the native header above the keyboard',
  async (platform, behavior) => {
    jest.replaceProperty(Platform, 'OS', platform);
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <HeaderHeightContext.Provider value={64}>
          <Tela keyboard scroll>
            <Text>Form</Text>
          </Tela>
        </HeaderHeightContext.Provider>,
      );
    });
    const layout = tree.root.findByType(KeyboardAvoidingView);
    expect(layout.props.enabled).toBe(true);
    expect(layout.props.behavior).toBe(behavior);
    expect(layout.props.keyboardVerticalOffset).toBe(64);
    await act(async () => tree.unmount());
  },
);
