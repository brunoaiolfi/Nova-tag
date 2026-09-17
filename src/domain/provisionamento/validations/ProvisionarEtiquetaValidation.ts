import { ResponsePadrao } from '../../ResponsePadrao';
import { ProvisionarEtiquetaModel } from '../models/ProvisionarEtiquetaModel';

export function validateProvisionarEtiqueta(model: ProvisionarEtiquetaModel): ResponsePadrao<ProvisionarEtiquetaModel> {
    if (!model.codigoEtiqueta || !model.codigoPedido) {
        return {
            sucesso: false,
            mensagem: 'Código da etiqueta e código do pedido são obrigatórios',
        };
    }

    return {
        sucesso: true,
        mensagem: 'Validação realizada com sucesso',
        dados: model,
    };
}
