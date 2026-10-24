import ToastMessage from 'react-native-toast-message';

import type {ExibirToastParams, IToast, OpcoesToast} from './types';
import {TipoToast} from './kind';

const DURACAO_PADRAO = 4000;
const DURACAO_INFO = 3000;

const duracaoPorTipo: Record<TipoToast, number> = {
  [TipoToast.SUCESSO]: DURACAO_PADRAO,
  [TipoToast.ERRO]: DURACAO_PADRAO,
  [TipoToast.AVISO]: DURACAO_PADRAO,
  [TipoToast.INFO]: DURACAO_INFO,
};

class ToastImplementation implements IToast {
  private exibir({tipo, mensagem, ...opcoes}: ExibirToastParams) {
    ToastMessage.show({
      type: tipo,
      text1: mensagem,
      ...(opcoes.descricao !== undefined ? {text2: opcoes.descricao} : {}),
      position: opcoes.posicao ?? 'top',
      visibilityTime: opcoes.duracao ?? duracaoPorTipo[tipo],
      autoHide: opcoes.esconderAutomaticamente ?? true,
      ...(opcoes.aoPressionar ? {onPress: opcoes.aoPressionar} : {}),
      ...(opcoes.aoEsconder ? {onHide: opcoes.aoEsconder} : {}),
    });
  }

  sucesso(mensagem: string, opcoes?: OpcoesToast) {
    this.exibir({...opcoes, tipo: TipoToast.SUCESSO, mensagem});
  }

  erro(mensagem: string, opcoes?: OpcoesToast) {
    this.exibir({...opcoes, tipo: TipoToast.ERRO, mensagem});
  }

  aviso(mensagem: string, opcoes?: OpcoesToast) {
    this.exibir({...opcoes, tipo: TipoToast.AVISO, mensagem});
  }

  info(mensagem: string, opcoes?: OpcoesToast) {
    this.exibir({...opcoes, tipo: TipoToast.INFO, mensagem});
  }

  esconder() {
    ToastMessage.hide();
  }
}

export const toast: IToast = new ToastImplementation();

/** Last-resort UI boundary; expected errors belong to the flow's own state. */
export function showCommandFailure(error: unknown): void {
  toast.erro(
    error instanceof Error
      ? error.message
      : 'Não foi possível concluir a ação. Tente novamente.',
  );
}

export type {
  ExibirToastParams,
  IToast,
  OpcoesToast,
  PosicaoToast,
} from './types';
export {TipoToast} from './kind';
