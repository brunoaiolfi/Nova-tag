import * as Crypto from 'expo-crypto';
import {AdministrationCoordinator} from '../../appplication/administration/coordinator';
import {
  AdministrationError,
  AdminContext,
} from '../../domain/administration/types';
import {sessionManager} from '../auth/runtime';
import {installationId} from '../traceability/runtime';
import {NativeAdministrativeNfc} from '../nfc/administration';
import {SqliteAdministrationStore} from './sqlite-store';
import {openAdministrationDatabase} from './database';
export const administrationStore = new SqliteAdministrationStore(
  openAdministrationDatabase,
);
export async function administrationContext(): Promise<AdminContext> {
  const s = sessionManager.getSnapshot();
  if (
    s.status !== 'authenticated' ||
    s.session.user.perfil !== 'ADMINISTRADOR' ||
    Date.parse(s.session.expiresAt) <= Date.now()
  )
    throw new AdministrationError(
      'ADMIN_LOGIN_NECESSARIO',
      'Entre como administrador e conecte-se à API para configurar a etiqueta.',
    );
  const session = s.session,
    station = await installationId();
  const sessionMarker = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    session.token,
  );
  if (sessionManager.getSnapshot().session?.token !== session.token)
    throw new AdministrationError(
      'ADMIN_SESSAO_ALTERADA',
      'O login mudou. Retome com outra sessão NFC.',
    );
  return {
    baseUrl: session.baseUrl,
    userId: session.user.id,
    station,
    sessionMarker,
  };
}
export const administration = new AdministrationCoordinator(
  sessionManager,
  administrationStore,
  new NativeAdministrativeNfc(),
  administrationContext,
  () => Crypto.randomUUID(),
);
