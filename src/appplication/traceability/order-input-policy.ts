import type {OrderInput} from './contracts/order.types';

export function normalizeOrderInput(input: OrderInput): OrderInput {
  const codigo = input.codigo.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(codigo)) {
    throw new Error(
      'Use até 64 letras sem acentos, números, pontos, traços ou sublinhados no código. Comece com uma letra ou número.',
    );
  }
  const descricao = input.descricao?.trim();
  if (descricao && descricao.length > 500) {
    throw new Error('A descrição pode ter até 500 caracteres.');
  }
  return {codigo, ...(descricao ? {descricao} : {})};
}
