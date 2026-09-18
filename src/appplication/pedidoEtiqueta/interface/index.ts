import { ProvisionarEtiquetaModel } from '../../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';

export interface IPedidoEtiquetaApplication {
    provisionarEtiqueta: (model: ProvisionarEtiquetaModel) => Promise<void>;
}
