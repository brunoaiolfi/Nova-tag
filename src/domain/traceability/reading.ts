export type Strategy = 'UID' | 'NDEF_ESTATICO' | 'SDM';

export interface Reading {
  uid: string;
  ndef?: string;
  tecnologias?: string[];
  bytesBase64?: string;
  modelo?: string;
}
