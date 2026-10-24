import React from 'react';
import {render as renderProbe, act} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';
import {AppState} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {NavigationContext} from '@react-navigation/native';
import type {NavigationProp, ParamListBase} from '@react-navigation/native';
import {createTestServices, withServices} from '../test-support/app-services';
import {useNfcReader} from '../src/components/Nfc/Leitor/use-nfc-reader';
import type {Reading} from '../src/domain/traceability/reading';

let reader: ReturnType<typeof useNfcReader>;
function Probe() {
  reader = useNfcReader({}, jest.fn());
  return null;
}
let tree: RenderResult;
afterEach(async () => {
  jest.restoreAllMocks();
});
test.each(['blur', 'background'] as const)(
  '%s cancels an active scan and discards a late physical result',
  async reason => {
    let resolveReading!: (reading: Reading) => void;
    const readPhysicalTag = jest.fn(
      () =>
        new Promise<Reading>(resolve => {
          resolveReading = resolve;
        }),
    );
    const cancelPhysicalRead = jest.fn().mockResolvedValue(undefined);
    const services = createTestServices({
      nfc: {readPhysicalTag, cancelPhysicalRead},
    });
    let blur!: () => void;
    let appState!: (state: AppStateStatus) => void;
    const removeAppState = jest.fn();
    const stopBlur = jest.fn();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        appState = listener;
        return {remove: removeAppState};
      });
    const navigation = {
      addListener: (_event: string, listener: () => void) => {
        blur = listener;
        return stopBlur;
      },
    } as unknown as NavigationProp<ParamListBase>;
    tree = await renderProbe(
      withServices(
        <NavigationContext.Provider value={navigation}>
          <Probe />
        </NavigationContext.Provider>,
        services,
      ),
    );
    expect(readPhysicalTag).not.toHaveBeenCalled();
    let reading!: Promise<void>;
    await act(async () => {
      reading = reader.read();
    });
    expect(readPhysicalTag).toHaveBeenCalledTimes(1);
    await act(async () => {
      appState('inactive');
    });
    expect(cancelPhysicalRead).not.toHaveBeenCalled();
    await act(async () => {
      if (reason === 'blur') blur();
      else appState('background');
    });
    expect(cancelPhysicalRead).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveReading({uid: 'late-tag'});
      await reading;
    });
    expect(reader.result).toBeUndefined();
    expect(reader.busy).toBe(false);
    await tree.unmount();
    expect(stopBlur).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalledTimes(1);
  },
);
