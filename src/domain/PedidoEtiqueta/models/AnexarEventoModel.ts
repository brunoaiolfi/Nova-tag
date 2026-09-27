import { EnumTipoEvento } from '../../enums/tipoEvento';

export type AnexarEventoModel = {
    codigoEtiqueta: string
    textoNdef?: string
    tipoEvento: EnumTipoEvento
}
