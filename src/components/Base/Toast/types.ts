import type {TipoToast} from './kind';

export type PosicaoToast = 'top' | 'bottom';

export type OpcoesToast = {
  /**
   * Texto secundário, exibido abaixo da mensagem principal.
   */
  descricao?: string | undefined;
  /**
   * Posição do toast na tela.
   * Padrão: `top`
   */
  posicao?: PosicaoToast | undefined;
  /**
   * Tempo em milissegundos até o toast sumir sozinho.
   * Padrão: 4000 (3000 para o tipo `info`)
   */
  duracao?: number | undefined;
  /**
   * Quando `false`, o toast só some ao ser pressionado ou via `toast.esconder()`.
   * Padrão: `true`
   */
  esconderAutomaticamente?: boolean | undefined;
  /**
   * Chamado quando o usuário pressiona o toast.
   */
  aoPressionar?: (() => void) | undefined;
  /**
   * Chamado quando o toast some.
   */
  aoEsconder?: (() => void) | undefined;
};

export type ExibirToastParams = OpcoesToast & {
  tipo: TipoToast;
  mensagem: string;
};

export interface IToast {
  sucesso(mensagem: string, opcoes?: OpcoesToast): void;
  erro(mensagem: string, opcoes?: OpcoesToast): void;
  aviso(mensagem: string, opcoes?: OpcoesToast): void;
  info(mensagem: string, opcoes?: OpcoesToast): void;
  esconder(): void;
}
