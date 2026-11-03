export interface Decision {
  historicoDecisoes?: Decision['decisao'][];
  armazenada: boolean;
  decisao: {
    revisao?: number;
    status?: 'AUTORIZADA' | 'PENDENTE' | 'REJEITADA' | 'TARDIA';
    avaliadaEm?: string;
    causaId?: string | null;
    expiraEm?: string | null;
    dependencias?: {tipo: string; estadoNecessario: string}[];
    sdm?: {
      perfil: string;
      politica: 'ESTRITA' | 'REGISTRO_TARDIO';
      epoca: number;
      autenticada: boolean;
      previamenteUtilizada: boolean;
      contador: number | null;
      maiorContadorAnterior: number | null;
      temporalidade: 'NAO_AVALIADA' | 'NOVA' | 'TARDIA' | 'REUTILIZADA';
    };
    autorizada: boolean;
    motivo: string;
    classificacao: string;
    avisos: string[];
  };
}
