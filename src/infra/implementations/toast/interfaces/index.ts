export enum TipoToast {
  SUCESSO = 'success',
  ERRO = 'error',
  AVISO = 'warning',
  INFO = 'info',
}

export type PosicaoToast = 'top' | 'bottom';

export type OpcoesToast = {
  /**
   * Texto secundário, exibido abaixo da mensagem principal.
   */
  descricao?: string;
  /**
   * Posição do toast na tela.
   * Padrão: `top`
   */
  posicao?: PosicaoToast;
  /**
   * Tempo em milissegundos até o toast sumir sozinho.
   * Padrão: 4000 (3000 para o tipo `info`)
   */
  duracao?: number;
  /**
   * Quando `false`, o toast só some ao ser pressionado ou via `toast.esconder()`.
   * Padrão: `true`
   */
  esconderAutomaticamente?: boolean;
  /**
   * Chamado quando o usuário pressiona o toast.
   */
  aoPressionar?: () => void;
  /**
   * Chamado quando o toast some.
   */
  aoEsconder?: () => void;
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
