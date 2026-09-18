import { BaseService } from '../base';
import { ProvisionarEtiquetaDTO } from './interfaces/dto';
import { IPedidoEtiquetaService } from './interfaces';

export class PedidoEtiquetaService extends BaseService implements IPedidoEtiquetaService {

  // TODO: trocar o stub pela chamada real da API de provisionamento.
  async provisionarEtiqueta(params: ProvisionarEtiquetaDTO): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}
