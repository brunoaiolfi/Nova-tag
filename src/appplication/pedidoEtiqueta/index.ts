import { IPedidoEtiquetaApplication } from './interface';
import { ProvisionarEtiquetaModel } from '../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';
import { IPedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta/interfaces';
import { validateProvisionarEtiqueta } from '../../domain/PedidoEtiqueta/validations/ProvisionarEtiquetaValidation';
import { PedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta';

class PedidoEtiquetaApplication implements IPedidoEtiquetaApplication {
    constructor(private readonly _service: IPedidoEtiquetaService) { }

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

export const pedidoEtiquetaApplication = new PedidoEtiquetaApplication(new PedidoEtiquetaService());
