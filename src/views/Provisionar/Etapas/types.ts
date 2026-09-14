export enum Etapa {
  LEITURA_INICIAL = 'leitura_inicial',
  IDENTIFICAR_PEDIDO = 'identificar_pedido',
  BLOQUEAR = 'bloquear',
}

export type DadosEtapa = {
  [Etapa.LEITURA_INICIAL]: {uid: string};
  [Etapa.IDENTIFICAR_PEDIDO]: {codigoPedido: string};
  [Etapa.BLOQUEAR]: void;
};

export type DadosProvisionamento = Partial<
  DadosEtapa[Etapa.LEITURA_INICIAL] & DadosEtapa[Etapa.IDENTIFICAR_PEDIDO]
>;

export type EtapaProps<E extends Etapa = Etapa> = {
  avancarEtapa: (dados: DadosEtapa[E]) => void;
  dados: DadosProvisionamento;
};

export type ComponentesEtapa = {
  [E in Etapa]: React.ComponentType<EtapaProps<E>>;
};
