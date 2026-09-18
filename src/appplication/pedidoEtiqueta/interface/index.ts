import { ResponsePadrao } from '../../../domain/ResponsePadrao';
import { AnexarEventoModel } from '../../../domain/PedidoEtiqueta/models/AnexarEventoModel';
import { ProvisionarEtiquetaModel } from '../../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';

export interface IPedidoEtiquetaApplication {
    provisionarEtiqueta: (model: ProvisionarEtiquetaModel) => Promise<ResponsePadrao<void>>;
    anexarEvento: (model: AnexarEventoModel) => Promise<ResponsePadrao<void>>;
}
