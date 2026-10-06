import * as Crypto from 'expo-crypto';
import {OfflineCoordinator} from '../../appplication/offline/coordinator';
import type {CaptureContext} from '../../domain/offline/types';
import {sessionManager} from '../auth/runtime';
import {traceability} from '../traceability/runtime';
import {SqliteCaptureStore} from './sqlite-store';
import {openCaptureDatabase} from './database';

export function captureContext(): CaptureContext | null {
  const state = sessionManager.getSnapshot();
  const session = state.session;
  if (!session || !['authenticated', 'offline'].includes(state.status))
    return null;
  const permitted =
    session.user.perfil !== 'CONSULTA' &&
    Date.parse(session.expiresAt) > Date.now();
  return {
    baseUrl: session.baseUrl,
    userId: session.user.id,
    canCapture: permitted,
    canSend: permitted && state.status === 'authenticated',
  };
}
export const captureStore = new SqliteCaptureStore(openCaptureDatabase);
export const offline = new OfflineCoordinator(
  captureStore,
  captureContext,
  sessionManager,
  reading => traceability.resolveProvisioning(reading),
  () => Crypto.randomUUID(),
);
