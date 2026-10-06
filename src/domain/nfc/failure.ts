export type NfcFailureCode =
  | 'NFC_BUSY'
  | 'NFC_CANCELLED'
  | 'NFC_TIMEOUT'
  | 'NFC_UNAVAILABLE'
  | 'NFC_DISABLED'
  | 'NFC_TAG_LOST'
  | 'NFC_INVALID_UID'
  | 'NFC_INVALID_RESPONSE'
  | 'NFC_ACCESS_DENIED'
  | 'NFC_UNSUPPORTED_TAG'
  | 'NFC_FAILURE';

export class NfcFailure extends Error {
  constructor(readonly code: NfcFailureCode, message: string) {
    super(message);
    this.name = 'NfcFailure';
  }
}
