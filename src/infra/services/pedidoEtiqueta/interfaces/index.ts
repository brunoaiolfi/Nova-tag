import { ProvisionarEtiquetaDTO } from './dto';

export interface IPedidoEtiquetaService {
    provisionarEtiqueta(params: ProvisionarEtiquetaDTO): Promise<void>;
}
