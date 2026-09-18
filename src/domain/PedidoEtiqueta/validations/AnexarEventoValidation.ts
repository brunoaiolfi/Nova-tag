import { ResponsePadrao } from '../../ResponsePadrao';
import { EnumTipoEvento } from '../../enums/tipoEvento';
import { AnexarEventoModel } from '../models/AnexarEventoModel';

export function validateAnexarEvento(model: AnexarEventoModel): ResponsePadrao<AnexarEventoModel> {
    if (!model.codigoEtiqueta || !model.tipoEvento) {
        return {
            sucesso: false,
            mensagem: 'Código da etiqueta e tipo do evento são obrigatórios',
        };
    }

    if (!Object.values(EnumTipoEvento).includes(model.tipoEvento)) {
        return {
            sucesso: false,
            mensagem: 'Tipo do evento inválido',
        };
    }

    return {
        sucesso: true,
        mensagem: 'Validação realizada com sucesso',
        dados: model,
    };
}
