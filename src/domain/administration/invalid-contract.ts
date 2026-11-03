import {AdministrationError} from './error';

export function invalid(): never {
  throw new AdministrationError(
    'ADMIN_CONTRATO_INVALIDO',
    'Resposta administrativa incompatível. Nenhum comando NFC será transmitido.',
  );
}
