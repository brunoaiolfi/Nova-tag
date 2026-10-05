import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import {TraceabilityWorkflow} from '../../appplication/traceability/workflow';
import {sessionManager} from '../auth/runtime';

export const traceability = new TraceabilityWorkflow(sessionManager);
let device: Promise<string> | undefined;
export function installationId() {
  device ??= (async () => {
    const key = 'com.novatag.device';
    const saved = await SecureStore.getItemAsync(key);
    if (saved) {
      return saved;
    }
    const id = `${Platform.OS}-${Crypto.randomUUID()}`;
    await SecureStore.setItemAsync(key, id);
    return id;
  })().catch(error => {
    device = undefined;
    throw error;
  });
  return device;
}
