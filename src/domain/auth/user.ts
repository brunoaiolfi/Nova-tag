export type Role = 'ADMINISTRADOR' | 'OPERADOR' | 'CONSULTA';

export interface User {
  id: string;
  login: string;
  nome: string;
  perfil: Role;
}
