export interface AdminCommand {
  id: string;
  sequencia: number;
  etapa: string;
  apduHex: string;
  alteraTag: boolean;
}
