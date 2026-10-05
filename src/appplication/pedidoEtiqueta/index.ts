import { IPedidoEtiquetaApplication } from './interface';
import { ResponsePadrao } from '../../domain/ResponsePadrao';
import { ProvisionarEtiquetaModel } from '../../domain/PedidoEtiqueta/models/ProvisionarEtiquetaModel';
import { AnexarEventoModel } from '../../domain/PedidoEtiqueta/models/AnexarEventoModel';
import { IPedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta/interfaces';
import { validateProvisionarEtiqueta } from '../../domain/PedidoEtiqueta/validations/ProvisionarEtiquetaValidation';
import { validateAnexarEvento } from '../../domain/PedidoEtiqueta/validations/AnexarEventoValidation';
import { PedidoEtiquetaService } from '../../infra/services/pedidoEtiqueta';
import { EnumEstrategiasNFC } from '../../domain/enums/estrategiasNFC';

class PedidoEtiquetaApplication implements IPedidoEtiquetaApplication {
    constructor(private readonly _service: IPedidoEtiquetaService) { }

    provisionarConformeEstrategia(model: ProvisionarEtiquetaModel, estrategia: EnumEstrategiasNFC): Promise<ResponsePadrao<void>> {
        switch (estrategia) {
            case EnumEstrategiasNFC.UID:
                return this.provisionarEtiquetaUID(model);
            case EnumEstrategiasNFC.NDEF_ESTATICO:
                return this.provisionarEtiquetaNDEF(model);
            default:
                return Promise.resolve({
                    sucesso: false,
                    mensagem: 'Estratégia não suportada',
                });
        }
    }

    private provisionarEtiquetaUID(model: ProvisionarEtiquetaModel): Promise<ResponsePadrao<void>> {
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
            estrategia: EnumEstrategiasNFC.UID,
        });
    }

    private provisionarEtiquetaNDEF(model: ProvisionarEtiquetaModel): Promise<ResponsePadrao<void>> {
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
            estrategia: EnumEstrategiasNFC.NDEF_ESTATICO,
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
            textoNdef: model.textoNdef,
            tipoEvento: model.tipoEvento,
        });
    }

}

export const pedidoEtiquetaApplication = new PedidoEtiquetaApplication(new PedidoEtiquetaService());
