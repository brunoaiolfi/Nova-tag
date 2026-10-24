import type {Provisioning} from '../../../domain/traceability/provisioning';
import {record, oneOf, integer} from '../../../domain/validation/values';
import {SessionError} from '../../auth/session-error';

function invalid(): never {
  throw new SessionError(
    'RESPOSTA_INVALIDA',
    'Vínculo incompatível com o contrato.',
  );
}
function decodeSdm(value: unknown): NonNullable<Provisioning['sdm']> {
  if (
    !record(value) ||
    typeof value.perfil !== 'string' ||
    typeof value.perfilCandidato !== 'boolean' ||
    !oneOf(value.politica, ['ESTRITA', 'REGISTRO_TARDIO']) ||
    typeof value.referenciaChaves !== 'string' ||
    !integer(value.versaoChaves, 0) ||
    !integer(value.metaReadSlot, 0, 15) ||
    !integer(value.fileReadSlot, 0, 15) ||
    typeof value.uriTemplate !== 'string'
  )
    invalid();
  return {
    perfil: value.perfil,
    perfilCandidato: value.perfilCandidato,
    politica: value.politica,
    referenciaChaves: value.referenciaChaves,
    versaoChaves: value.versaoChaves,
    metaReadSlot: value.metaReadSlot,
    fileReadSlot: value.fileReadSlot,
    uriTemplate: value.uriTemplate,
  };
}
/** Used for remote results and persisted cache snapshots. */
export function decodeProvisioning(value: unknown): Provisioning {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.pedidoId !== 'string' ||
    typeof value.uid !== 'string' ||
    !oneOf(value.estrategia, ['UID', 'NDEF_ESTATICO', 'SDM']) ||
    !oneOf(value.status, ['REGISTRADA', 'ATIVA', 'DESPROVISIONADA']) ||
    (value.referenciaNdef !== null &&
      typeof value.referenciaNdef !== 'string') ||
    (value.epoca !== undefined && !integer(value.epoca, 1)) ||
    (value.modelo !== undefined && typeof value.modelo !== 'string')
  )
    invalid();
  return {
    id: value.id,
    pedidoId: value.pedidoId,
    uid: value.uid,
    estrategia: value.estrategia,
    status: value.status,
    referenciaNdef: value.referenciaNdef,
    ...(value.epoca !== undefined ? {epoca: value.epoca} : {}),
    ...(value.modelo !== undefined ? {modelo: value.modelo} : {}),
    ...(value.sdm !== undefined ? {sdm: decodeSdm(value.sdm)} : {}),
  };
}
