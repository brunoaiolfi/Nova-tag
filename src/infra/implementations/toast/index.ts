import ToastMessage from 'react-native-toast-message';

import { ExibirToastParams, IToast, OpcoesToast, TipoToast } from './interfaces';

const DURACAO_PADRAO = 4000;
const DURACAO_INFO = 3000;

const duracaoPorTipo: Record<TipoToast, number> = {
    [TipoToast.SUCESSO]: DURACAO_PADRAO,
    [TipoToast.ERRO]: DURACAO_PADRAO,
    [TipoToast.AVISO]: DURACAO_PADRAO,
    [TipoToast.INFO]: DURACAO_INFO,
};

class ToastImplementation implements IToast {
    private exibir({ tipo, mensagem, ...opcoes }: ExibirToastParams) {
        ToastMessage.show({
            type: tipo,
            text1: mensagem,
            text2: opcoes.descricao,
            position: opcoes.posicao ?? 'top',
            visibilityTime: opcoes.duracao ?? duracaoPorTipo[tipo],
            autoHide: opcoes.esconderAutomaticamente ?? true,
            onPress: opcoes.aoPressionar,
            onHide: opcoes.aoEsconder,
        });
    }

    sucesso(mensagem: string, opcoes?: OpcoesToast) {
        this.exibir({ ...opcoes, tipo: TipoToast.SUCESSO, mensagem });
    }

    erro(mensagem: string, opcoes?: OpcoesToast) {
        this.exibir({ ...opcoes, tipo: TipoToast.ERRO, mensagem });
    }

    aviso(mensagem: string, opcoes?: OpcoesToast) {
        this.exibir({ ...opcoes, tipo: TipoToast.AVISO, mensagem });
    }

    info(mensagem: string, opcoes?: OpcoesToast) {
        this.exibir({ ...opcoes, tipo: TipoToast.INFO, mensagem });
    }

    esconder() {
        ToastMessage.hide();
    }
}

export const toast: IToast = new ToastImplementation();

export * from './interfaces';
