import {BaseService} from '../base';
import {ResponsePadrao} from '../../../domain/ResponsePadrao';
import {AnexarEventoDTO, ProvisionarEtiquetaDTO} from './interfaces/dto';
import {IPedidoEtiquetaService} from './interfaces';

export class PedidoEtiquetaService
  extends BaseService
  implements IPedidoEtiquetaService
{
  // TODO: trocar o stub pela chamada real da API de provisionamento.
  async provisionarEtiqueta(
    _params: ProvisionarEtiquetaDTO,
  ): Promise<ResponsePadrao<void>> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      sucesso: true,
      mensagem: 'Etiqueta provisionada com sucesso',
    };
  }

  // TODO: trocar o stub pela chamada real da API de eventos.
  async anexarEvento(_params: AnexarEventoDTO): Promise<ResponsePadrao<void>> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      sucesso: true,
      mensagem: 'Evento registrado com sucesso',
    };
  }
}
