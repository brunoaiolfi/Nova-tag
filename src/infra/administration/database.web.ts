import {AdministrationError} from '../../domain/administration/types';
import type {SqlConnection} from '../offline/sqlite-store';
export async function openAdministrationDatabase(): Promise<SqlConnection> {
  throw new AdministrationError(
    'ADMIN_ARMAZENAMENTO_INDISPONIVEL',
    'A administração NFC exige o aplicativo nativo instalado.',
  );
}
