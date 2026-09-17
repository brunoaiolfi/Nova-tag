import { ProvisionarEtiquetaDTO } from './dto';

export interface IProvisionamentoService {
    provisionarEtiqueta(params: ProvisionarEtiquetaDTO): Promise<void>;
}
