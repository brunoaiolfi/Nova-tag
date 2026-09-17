export type ResponsePadrao<T> = {
    sucesso: boolean;
    mensagem: string;
    dados?: T;
}
