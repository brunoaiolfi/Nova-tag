export enum Etapa {
  IDENTIFICAR_PEDIDO = 'identificar_pedido',
  LEITURA_E_BLOQUEIO = 'leitura_e_bloqueio',
}

export type DadosEtapa = {
  [Etapa.IDENTIFICAR_PEDIDO]: {codigoPedido: string};
  [Etapa.LEITURA_E_BLOQUEIO]: {uid: string};
};

export type DadosProvisionamento = Partial<
  DadosEtapa[Etapa.IDENTIFICAR_PEDIDO] & DadosEtapa[Etapa.LEITURA_E_BLOQUEIO]
>;

export type EtapaProps<E extends Etapa = Etapa> = {
  avancarEtapa: (dados: DadosEtapa[E]) => void;
  dados: DadosProvisionamento;
};

export type ComponentesEtapa = {
  [E in Etapa]: React.ComponentType<EtapaProps<E>>;
};
