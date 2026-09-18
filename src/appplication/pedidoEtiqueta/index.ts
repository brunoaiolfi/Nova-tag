import { IPedidoEtiquetaApplication } from './interface';
import { ResponsePadrao } from '../../domain/ResponsePadrao';
import { ProvisionarEtiquetaModel } from '../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';
import { AnexarEventoModel } from '../../domain/PedidoEtiqueta/models/AnexarEventoModel';
import { IPedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta/interfaces';
import { validateProvisionarEtiqueta } from '../../domain/PedidoEtiqueta/validations/ProvisionarEtiquetaValidation';
import { validateAnexarEvento } from '../../domain/PedidoEtiqueta/validations/AnexarEventoValidation';
import { PedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta';

class PedidoEtiquetaApplication implements IPedidoEtiquetaApplication {
    constructor(private readonly _service: IPedidoEtiquetaService) { }

    provisionarEtiqueta(model: ProvisionarEtiquetaModel): Promise<ResponsePadrao<void>> {
        const validation = validateProvisionarEtiqueta(model);

        if (!validation.sucesso) {
            return Promise.resolve({
                sucesso: false,
                mensagem: validation.mensagem,
            });
        }

        return this._service.provisionarEtiqueta({
            codigoPedido: model.codigoPedido,
            uid: model.codigoEtiqueta,
        });
    }

    anexarEvento(model: AnexarEventoModel): Promise<ResponsePadrao<void>> {
        const validation = validateAnexarEvento(model);

        if (!validation.sucesso) {
            return Promise.resolve({
                sucesso: false,
                mensagem: validation.mensagem,
            });
        }

        return this._service.anexarEvento({
            uid: model.codigoEtiqueta,
            tipoEvento: model.tipoEvento,
        });
    }

}

export const pedidoEtiquetaApplication = new PedidoEtiquetaApplication(new PedidoEtiquetaService());
