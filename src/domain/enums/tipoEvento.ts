export enum EnumTipoEvento {
  PROVISIONAMENTO = 'PROVISIONAMENTO',
  COLETA = 'COLETA',
  RECEBIMENTO = 'RECEBIMENTO',
  MOVIMENTACAO = 'MOVIMENTACAO',
  EXPEDICAO = 'EXPEDICAO',
  ENTREGA = 'ENTREGA',
}

export const descricaoEnumTipoEvento: Record<EnumTipoEvento, string> = {
  [EnumTipoEvento.PROVISIONAMENTO]: 'Provisionamento',
  [EnumTipoEvento.COLETA]: 'Coleta',
  [EnumTipoEvento.RECEBIMENTO]: 'Recebimento',
  [EnumTipoEvento.MOVIMENTACAO]: 'Movimentação',
  [EnumTipoEvento.EXPEDICAO]: 'Expedição',
  [EnumTipoEvento.ENTREGA]: 'Entrega',
};
