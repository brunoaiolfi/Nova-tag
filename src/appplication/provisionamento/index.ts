import { IProvisionamentoApplication } from './interface';
import { ProvisionarEtiquetaModel } from '../../domain/provisionamento/models/ProvisionarEtiquetaModel';
import { IProvisionamentoService } from '../../infra/services/provisionamento/interfaces';
import { validateProvisionarEtiqueta } from '../../domain/provisionamento/validations/ProvisionarEtiquetaValidation';
import { ProvisionamentoService } from '../../infra/services/provisionamento';

class ProvisionamentoApplication implements IProvisionamentoApplication {
    constructor(private readonly _service: IProvisionamentoService) { }

    provisionarEtiqueta(model: ProvisionarEtiquetaModel): Promise<void> {
        const validation = validateProvisionarEtiqueta(model);

        if (!validation.sucesso) {
            throw new Error(validation.mensagem);
        }

        return this._service.provisionarEtiqueta({
            codigoPedido: model.codigoPedido,
            uid: model.codigoEtiqueta,
        });
    }

}

export const provisionamentoApplication = new ProvisionamentoApplication(new ProvisionamentoService());
