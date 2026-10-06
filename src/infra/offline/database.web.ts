import {OfflineError} from '../../domain/offline/types';
import type {SqlConnection} from './sqlite-store';
export async function openCaptureDatabase(): Promise<SqlConnection> {
  throw new OfflineError(
    'PLATAFORMA_NAO_SUPORTADA',
    'A captura offline está disponível no aplicativo Android/iPhone. Use o aplicativo instalado para registrar etapas.',
  );
}
