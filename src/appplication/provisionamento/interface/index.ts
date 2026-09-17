import { ProvisionarEtiquetaModel } from '../../../domain/provisionamento/models/ProvisionarEtiquetaModel';

export interface IProvisionamentoApplication {
    provisionarEtiqueta: (model: ProvisionarEtiquetaModel) => Promise<void>;
}
