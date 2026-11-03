import {decodeExperimentPlan} from './plan-decoder';
import type {Api} from '../auth/ports/authenticated-api';
import type {CaptureOwner} from '../../domain/offline/owner';
import type {ExperimentRun, CatalogPage, PlanPage} from './catalog.types';
import {record, integer} from '../../domain/validation/values';
import {SessionError} from '../auth/session-error';

function invalid(): never {
  throw new SessionError(
    'RESPOSTA_INVALIDA',
    'Catálogo de experimentos incompatível.',
  );
}
function pageItems(value: unknown): {items: unknown[]; total: number} {
  if (!record(value) || !Array.isArray(value.items) || !integer(value.total, 0))
    invalid();
  return {
    items: Array.from(value.items, item => {
      if (!record(item)) invalid();
      return item.input;
    }),
    total: value.total,
  };
}
function run(value: unknown): ExperimentRun {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.dataKind !== 'string' ||
    !record(value.configuration) ||
    !integer(value.configuration.timeoutMs, 1)
  )
    invalid();
  return {
    id: value.id,
    name: value.name,
    dataKind: value.dataKind,
    configuration: {timeoutMs: value.configuration.timeoutMs},
  };
}
/** Authenticated query API; presentation never constructs endpoint paths. */
export class ExperimentCatalog {
  constructor(private readonly api: Api) {}
  private async query(path: string, owner: CaptureOwner) {
    return pageItems(
      await this.api.request(path, {
        expectedUserId: owner.userId,
        expectedBaseUrl: owner.baseUrl,
      }),
    );
  }
  async runs(
    owner: CaptureOwner,
    page = 1,
  ): Promise<CatalogPage<ExperimentRun>> {
    const result = await this.query(
      `/experimentos?pagina=${page}&limite=20`,
      owner,
    );
    return {items: result.items.map(run), total: result.total, page};
  }
  async plans(
    owner: CaptureOwner,
    selected: ExperimentRun,
    device: string,
    page = 1,
  ): Promise<PlanPage> {
    const result = await this.query(
      `/experimentos/${encodeURIComponent(
        selected.id,
      )}/tentativas?pagina=${page}&limite=20`,
      owner,
    );
    return {
      items: result.items
        .map(item =>
          decodeExperimentPlan(item, selected.configuration.timeoutMs),
        )
        .filter(
          item => item.deviceId === device && item.mode === 'LEITURA_FISICA',
        ),
      total: result.total,
      page,
    };
  }
}
