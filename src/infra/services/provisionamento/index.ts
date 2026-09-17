import { BaseService } from '../base';
import { ProvisionarEtiquetaDTO } from './interfaces/dto';

export class ProvisionamentoService extends BaseService {

  // TODO: trocar o stub pela chamada real da API de provisionamento.
  async provisionarEtiqueta(params: ProvisionarEtiquetaDTO): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}
