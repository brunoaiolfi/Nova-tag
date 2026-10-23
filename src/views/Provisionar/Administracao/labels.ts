import type {AdminOperation} from '../../../domain/administration/operation';

export function stageLabel(stage: string): string {
  if (
    stage.includes('AUTH') ||
    stage.includes('AUTENTICAR') ||
    stage.includes('DESAFIO') ||
    stage.includes('CONFIRMAR_AUTH')
  )
    return 'Autenticando a etiqueta';
  if (stage.includes('TROCAR_CHAVE'))
    return `Atualizando a chave ${stage.at(-1)}`;
  if (stage.startsWith('GRAVAR_NDEF'))
    return 'Gravando a identificação do pedido';
  if (stage === 'GRAVAR_CC') return 'Protegendo a escrita pública';
  if (stage.includes('CONFIG')) return 'Conferindo as permissões dos arquivos';
  if (stage.includes('CONFERIR')) return 'Conferindo os dados gravados';
  if (stage.includes('UID')) return 'Conferindo a identidade autenticada';
  if (stage.includes('VERSAO')) return 'Conferindo as versões das chaves';
  return 'Conferindo a configuração da etiqueta';
}
export const administrationStatusLabel = (op: AdminOperation) =>
  op.status === 'ENCERRADA'
    ? 'Operação encerrada'
    : op.alteracaoFisica === 'CONFERIDA'
    ? 'Configuração conferida'
    : op.status === 'INTERROMPIDA'
    ? 'Configuração interrompida'
    : op.status === 'PERSONALIZANDO'
    ? 'Sessão NFC em andamento'
    : 'Plano pronto para configurar';
