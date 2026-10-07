import {
  descricaoEnumTipoEvento,
  EnumTipoEvento,
} from '../domain/enums/tipoEvento';

const reasons: Record<string, string> = {
  SDM_INVALIDA:
    'Não foi possível autenticar esta leitura SDM. O pedido não foi alterado.',
  SDM_EVIDENCIA_REUTILIZADA:
    'Esta leitura já foi utilizada. Aproxime novamente a etiqueta para obter uma nova evidência.',
  SDM_CONTADOR_NAO_CRESCENTE:
    'A leitura chegou fora de ordem e a política estrita impediu a movimentação.',
  SDM_REGISTRO_TARDIO:
    'Leitura autenticada recebida fora de ordem. Ficou preservada para análise, sem movimentar o pedido.',
  SDM_CHAVES_INDISPONIVEIS:
    'O servidor precisa recuperar as chaves da etiqueta. A captura será reenviada.',
  ACEITA: 'O evento está de acordo com a sequência logística do pedido.',
  VINCULO_ATIVADO: 'Etiqueta ativada e pronta para registrar operações.',
  SEQUENCIA_INVALIDA:
    'Este evento não é permitido no estado atual do pedido. Confira se as etapas anteriores já foram registradas.',
  VINCULO_INATIVO:
    'A etiqueta precisa estar ativa. Conclua o provisionamento antes de registrar eventos.',
  VINCULO_NAO_ENCONTRADO: 'O vínculo desta etiqueta não foi encontrado.',
  UID_DIVERGENTE: 'O número da etiqueta lida é diferente do número cadastrado.',
  NDEF_DIVERGENTE:
    'A referência NDEF lida é diferente da referência do vínculo.',
  MODELO_DIVERGENTE: 'O modelo informado diverge do modelo cadastrado.',
  EVENTO_RESERVADO:
    'O provisionamento é registrado somente ao ativar a etiqueta.',
};
const states: Record<string, string> = {
  CADASTRADO: 'Cadastrado',
  COLETADO: 'Coletado',
  RECEBIDO: 'Recebido',
  ENTREGUE: 'Entregue',
};
export const reasonLabel = (reason: string) =>
  reasons[reason] ?? `Motivo informado pelo servidor: ${reason}`;
export const stateLabel = (state: string | null) =>
  state ? states[state] ?? state : 'Não informado';
export const eventLabel = (event: string) =>
  descricaoEnumTipoEvento[event as EnumTipoEvento] ?? event;
