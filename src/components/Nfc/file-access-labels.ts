import type {FileAccessRights} from '../../domain/nfc/file-settings';
import {accessRequirement, writeAccess} from '../../domain/nfc/access-policy';

export function accessDescription(right: number): string {
  const requirement = accessRequirement(right);
  if (requirement.kind === 'key') return `Exige chave ${requirement.slot}`;
  return requirement.kind === 'free'
    ? 'Livre'
    : 'Sem acesso por esta permissão';
}

/** Both write routes matter; a restricted Write alone does not protect ReadWrite. */
export function writeAccessSummary(rights: FileAccessRights): string {
  const summaries = {
    free: 'O chip declara uma rota de escrita livre.',
    blocked: 'O chip declara as duas rotas de escrita sem acesso.',
    key: 'As rotas de escrita disponíveis exigem chave.',
  };
  return summaries[writeAccess(rights)];
}
