export type ProvisionarEtiquetaParams = {
  codigoPedido: string;
  uid: string;
};

/**
 * Vincula a etiqueta ao pedido e grava as chaves que bloqueiam a escrita.
 *
 * TODO: trocar o stub pela chamada real da API de provisionamento.
 */
export async function provisionarEtiqueta({
  codigoPedido,
  uid,
}: ProvisionarEtiquetaParams): Promise<void> {
  console.log('Provisionando etiqueta', {codigoPedido, uid});

  await new Promise(resolve => setTimeout(resolve, 1500));
}
