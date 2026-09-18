import { ResponsePadrao } from '../../../../domain/ResponsePadrao';
import { AnexarEventoDTO, ProvisionarEtiquetaDTO } from './dto';

export interface IPedidoEtiquetaService {
    provisionarEtiqueta(params: ProvisionarEtiquetaDTO): Promise<ResponsePadrao<void>>;
    anexarEvento(params: AnexarEventoDTO): Promise<ResponsePadrao<void>>;
}
