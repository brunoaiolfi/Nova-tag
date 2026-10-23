import type {ExperimentPlan} from '../../domain/experimentation/plan';

export interface ExperimentRun {
  id: string;
  name: string;
  dataKind: string;
  configuration: {timeoutMs: number};
}
export interface CatalogPage<T> {
  items: T[];
  page: number;
  total: number;
}
export type PlanPage = CatalogPage<ExperimentPlan>;
