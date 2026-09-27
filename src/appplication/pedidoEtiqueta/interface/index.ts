import { ResponsePadrao } from '../../../domain/ResponsePadrao';
import { AnexarEventoModel } from '../../../domain/PedidoEtiqueta/models/AnexarEventoModel';
import { ProvisionarEtiquetaModel } from '../../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';
import { EnumEstrategiasNFC } from '../../../domain/enums/estrategiasNFC';

export interface IPedidoEtiquetaApplication {
    provisionarConformeEstrategia: (model: ProvisionarEtiquetaModel, estrategia: EnumEstrategiasNFC) => Promise<ResponsePadrao<void>>;
    anexarEvento: (model: AnexarEventoModel) => Promise<ResponsePadrao<void>>;
}
