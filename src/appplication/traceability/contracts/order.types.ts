import type {Provisioning} from '../../../domain/traceability/provisioning';

export interface OrderSummary {
  id: string;
  codigo: string;
  descricao: string | null;
  estado: string;
}

export interface OrderPage {
  itens: OrderSummary[];
  total: number;
}

export interface OrderDetails extends OrderSummary {
  expedido: boolean;
  provisionamentoVigente?: Provisioning | null;
}

export interface OrderInput {
  codigo: string;
  descricao?: string;
}
