import type {AuthSnapshot} from './session-manager';
import type {CaptureContext} from '../offline/capture-context.types';
import {AdministrationError} from '../../domain/administration/error';
import {AdminContext} from '../administration/operation-context.types';

export function captureContext(
  state: AuthSnapshot,
  now: number,
): CaptureContext | null {
  const session = state.session;
  if (!session || !['authenticated', 'offline'].includes(state.status))
    return null;
  const permitted =
    session.user.perfil !== 'CONSULTA' && Date.parse(session.expiresAt) > now;
  return {
    baseUrl: session.baseUrl,
    userId: session.user.id,
    canCapture: permitted,
    canSend: permitted && state.status === 'authenticated',
  };
}

export async function administrationContext(
  snapshot: () => AuthSnapshot,
  installationId: () => Promise<string>,
  marker: (token: string) => Promise<string>,
  now: () => number,
): Promise<AdminContext> {
  const state = snapshot();
  if (
    state.status !== 'authenticated' ||
    state.session.user.perfil !== 'ADMINISTRADOR' ||
    Date.parse(state.session.expiresAt) <= now()
  )
    throw new AdministrationError(
      'ADMIN_LOGIN_NECESSARIO',
      'Entre como administrador e conecte-se à API para configurar a etiqueta.',
    );
  const session = state.session;
  const station = await installationId();
  const sessionMarker = await marker(session.token);
  if (snapshot().session?.token !== session.token)
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
