import { EnumEstrategiasNFC } from '../../../../../domain/enums/estrategiasNFC';

export interface ProvisionarEtiquetaDTO {
    codigoPedido: string;
    uid: string;
    estrategia: EnumEstrategiasNFC;
}

export interface AnexarEventoDTO {
    uid: string;
    textoNdef?: string;
    tipoEvento: string;
}
