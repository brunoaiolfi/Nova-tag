import {businessOutcome} from '../../domain/traceability/decision-status';
import type {Api} from '../traceability/workflow';
import {assertSdmReading} from '../../domain/traceability/sdm-reading';
import type {
  Reading,
  Provisioning,
  Observation,
  Decision,
} from '../../domain/traceability/types';
import {
  CaptureContext,
  CaptureOwner,
  CaptureStore,
  QueuedCapture,
  OfflineError,
} from '../../domain/offline/types';

export interface OfflineSnapshot {
  loading: boolean;
  syncing: boolean;
  items: QueuedCapture[];
  error: string | null;
}
interface BatchItem {
  indice: number;
  id: string | null;
  sucesso: boolean;
  status: number;
  codigo: string | null;
  mensagem: string;
  dados: Decision | null;
}
const captureAge = 24 * 60 * 60 * 1000;
const leaseMs = 45000;
function errorInfo(error: unknown) {
  const item = error as {
    code?: string;
    status?: number;
    message?: string;
  } | null;
  return {
    code: item?.code ?? 'API_INDISPONIVEL',
    status: item?.status,
    message: item?.message ?? 'Não foi possível sincronizar agora.',
  };
}
function unavailable(error: unknown) {
  const e = errorInfo(error);
  return (
    ['API_INDISPONIVEL', 'RESPOSTA_INVALIDA'].includes(
      (error as {code?: string})?.code ?? '',
    ) ||
    (e.status !== undefined && e.status >= 500)
  );
}
function sameOwner(a: CaptureOwner | null, b: CaptureOwner | null) {
  return !!a && !!b && a.userId === b.userId && a.baseUrl === b.baseUrl;
}
function immutable<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => immutable(child));
    Object.freeze(value);
  }
  return value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return (
      '{' +
      Object.keys(object)
        .sort()
        .map(key => JSON.stringify(key) + ':' + canonical(object[key]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value) ?? 'null';
}
function decision(value: unknown): value is Decision {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Decision;
  return (
    receipt.armazenada === true &&
    !!receipt.decisao &&
    typeof receipt.decisao.autorizada === 'boolean' &&
    typeof receipt.decisao.motivo === 'string' &&
    ['REGULAR', 'SUSPEITO'].includes(receipt.decisao.classificacao) &&
    Array.isArray(receipt.decisao.avisos) &&
    receipt.decisao.avisos.every(warning => typeof warning === 'string') &&
    (receipt.decisao.revisao === undefined ||
      (Number.isInteger(receipt.decisao.revisao) &&
        receipt.decisao.revisao >= 1)) &&
    (receipt.decisao.status === undefined ||
      ['AUTORIZADA', 'PENDENTE', 'REJEITADA', 'TARDIA'].includes(
        receipt.decisao.status,
      ))
  );
}
function bytes(value: string) {
  let size = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    size += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
  }
  return size;
}
export class OfflineCoordinator {
  private snapshot: OfflineSnapshot = {
    loading: true,
    syncing: false,
    items: [],
    error: null,
  };
  private listeners = new Set<() => void>();
  private synchronization?: Promise<void>;
  private view?: OfflineSnapshot;
  private viewSource?: OfflineSnapshot;
  private viewOwner = '';
  constructor(
    private readonly store: CaptureStore,
    private readonly context: () => CaptureContext | null,
    private readonly api: Api,
    private readonly resolve: (reading: Reading) => Promise<Provisioning>,
    private readonly identifier: () => string,
    private readonly now: () => number = Date.now,
  ) {}
  getSnapshot = () => {
    const owner = this.context();
    const key = owner ? owner.baseUrl + '/' + owner.userId : '';
    if (this.viewSource !== this.snapshot || this.viewOwner !== key) {
      this.viewSource = this.snapshot;
      this.viewOwner = key;
      this.view = {
        ...this.snapshot,
        items: this.snapshot.items.filter(item => sameOwner(owner, item.owner)),
      };
    }
    return this.view!;
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<OfflineSnapshot>) {
    this.snapshot = {...this.snapshot, ...patch};
    this.listeners.forEach(listener => listener());
  }
  async refresh() {
    const owner = this.context();
    try {
      await this.store.initialize();
      const items = owner ? await this.store.list(owner) : [];
      if (sameOwner(owner, this.context()) || (!owner && !this.context()))
        this.publish({loading: false, items, error: null});
    } catch (error) {
      this.publish({
        loading: false,
        items: [],
        error:
          error instanceof OfflineError
            ? error.message
            : 'Não foi possível abrir as capturas salvas. Atualize o aplicativo de desenvolvimento e tente novamente; não desinstale se houver registros pendentes.',
      });
    }
  }
  private owner() {
    const owner = this.context();
    if (!owner?.canCapture)
      throw new OfflineError(
        'IDENTIDADE_NECESSARIA',
        'Entre com um operador antes de registrar capturas.',
      );
    return {...owner};
  }
  async remember(reading: Reading) {
    const owner = this.owner();
    if (!owner.canSend)
      throw new OfflineError(
        'CONEXAO_NECESSARIA',
        'Conecte-se para disponibilizar esta etiqueta offline.',
      );
    const p = await this.resolve(reading);
    if (!sameOwner(owner, this.context()))
      throw new OfflineError(
        'OPERADOR_DIVERGENTE',
        'A sessão mudou. Faça uma nova leitura.',
      );
    if (p.status !== 'ATIVA')
      throw new OfflineError(
        'VINCULO_INATIVO',
        'Ative o vínculo antes de disponibilizar a etiqueta offline.',
      );
    await this.store.remember(owner, p, this.now());
    return p;
  }
  async capture(
    reading: Reading,
    type: string,
    id: string,
    occurredAt: string,
    deviceId: string,
    expectedOwner?: CaptureOwner,
  ) {
    const owner = this.owner();
    if (expectedOwner && !sameOwner(owner, expectedOwner))
      throw new OfflineError(
        'OPERADOR_DIVERGENTE',
        'Entre com o operador que realizou a leitura para confirmar esta captura.',
      );
    const raw = immutable(JSON.parse(JSON.stringify(reading)) as Reading);
    if (
      typeof raw.uid !== 'string' ||
      !raw.uid.trim() ||
      (raw.ndef !== undefined && typeof raw.ndef !== 'string') ||
      (raw.bytesBase64 !== undefined && typeof raw.bytesBase64 !== 'string') ||
      (raw.tecnologias !== undefined &&
        (!Array.isArray(raw.tecnologias) ||
          raw.tecnologias.some(value => typeof value !== 'string')))
    ) {
      throw new OfflineError(
        'LEITURA_INVALIDA',
        'A leitura contém dados inválidos. Faça uma nova leitura antes de confirmar.',
      );
    }
    const existing = await this.store.get(owner, id);
    if (existing) {
      if (
        !sameOwner(owner, this.context()) ||
        existing.payload.tipo !== type ||
        existing.payload.ocorridoEm !== occurredAt ||
        existing.payload.dispositivoId !== deviceId ||
        canonical(existing.payload.leituraBruta) !== canonical(raw)
      ) {
        throw new OfflineError(
          'CAPTURA_LOCAL_CONFLITANTE',
          'O identificador já pertence a outra captura. O registro original foi preservado.',
        );
      }
      await this.refresh();
      return existing;
    }
    let p: Provisioning | null = null;
    let cacheUsed = !owner.canSend;
    if (owner.canSend) {
      try {
        p = await this.resolve(raw);
      } catch (error) {
        if (!unavailable(error)) throw error;
        cacheUsed = true;
      }
    }
    if (cacheUsed)
      p = await this.store.cached(owner, raw, this.now(), captureAge);
    if (!p)
      throw new OfflineError(
        'ETIQUETA_NAO_DISPONIVEL_OFFLINE',
        'Esta etiqueta não está disponível offline ou sua confirmação expirou. Conecte-se e use Disponibilizar etiqueta antes de sair para a coleta.',
      );
    if (p.status !== 'ATIVA')
      throw new OfflineError(
        'VINCULO_INATIVO',
        'O vínculo precisa estar ativo para capturar.',
      );
    assertSdmReading(p, raw);
    const current = this.context();
    if (!sameOwner(owner, current) || !current?.canCapture)
      throw new OfflineError(
        'OPERADOR_DIVERGENTE',
        'A sessão mudou. A captura não foi confirmada.',
      );
    if (!cacheUsed) await this.store.remember(owner, p, this.now());
    const payload: Observation = immutable({
      id,
      versaoContrato: 1,
      provisionamentoId: p.id,
      tipo: type,
      ocorridoEm: occurredAt,
      dispositivoId: deviceId,
      operadorId: owner.userId,
      leituraBruta: raw,
    });
    if (bytes(JSON.stringify({itens: [payload]})) > 28000)
      throw new OfflineError(
        'CAPTURA_EXCEDIDA',
        'A captura excede o tamanho permitido. Ela ainda não foi confirmada.',
      );
    const saved = await this.store.enqueue(
      owner,
      payload,
      {provisioning: p, cacheUsed},
      this.now(),
    );
    await this.refresh();
    return saved;
  }
  synchronize(force = false): Promise<void> {
    if (this.synchronization) return this.synchronization;
    const work = this.flush(force).finally(() => {
      this.synchronization = undefined;
    });
    this.synchronization = work;
    return work;
  }
  private async flush(force: boolean) {
    const owner = this.context();
    if (!owner?.canSend) {
      await this.refresh();
      return;
    }
    this.publish({syncing: true, error: null});
    try {
      if (force) await this.store.resume(owner, this.now());
      for (
        let cycle = 0;
        cycle < 10 &&
        sameOwner(owner, this.context()) &&
        this.context()?.canSend;
        cycle++
      ) {
        const claim = this.identifier();
        const claimed = await this.store.claim(
          owner,
          claim,
          this.now(),
          leaseMs,
          20,
        );
        if (!claimed.length) break;
        const sent: QueuedCapture[] = [];
        for (const item of claimed) {
          const candidate = [...sent, item];
          if (
            bytes(JSON.stringify({itens: candidate.map(c => c.payload)})) <=
            28000
          )
            sent.push(item);
          else
            await this.store.settle(item.id, claim, {
              state: 'RETRY',
              nextAttemptAt: this.now(),
            });
        }
        if (!sent.length)
          throw new OfflineError(
            'CAPTURA_EXCEDIDA',
            'Há uma captura acima do limite. O registro original foi preservado.',
          );
        try {
          const result = await this.api.request<{itens: BatchItem[]}>(
            '/eventos/lote',
            {
              method: 'POST',
              body: {itens: sent.map(item => item.payload)},
              expectedUserId: owner.userId,
              expectedBaseUrl: owner.baseUrl,
            },
          );
          if (
            !Array.isArray(result?.itens) ||
            result.itens.length !== sent.length ||
            result.itens.some(
              (item, index) =>
                !item ||
                item.indice !== index ||
                item.id !== sent[index].id ||
                typeof item.sucesso !== 'boolean' ||
                (item.sucesso
                  ? item.status !== 200 || !decision(item.dados)
                  : !Number.isInteger(item.status) ||
                    item.status < 400 ||
                    typeof item.codigo !== 'string'),
            )
          ) {
            throw new OfflineError(
              'RESPOSTA_INVALIDA',
              'Resposta incompleta da API; a captura será reenviada com o mesmo identificador.',
            );
          }
          for (const [index, item] of sent.entries()) {
            const answer = result.itens[index];
            if (answer.sucesso && answer.dados)
              await this.store.settle(item.id, claim, {
                state: 'STORED',
                businessState: businessOutcome(answer.dados),
                result: answer.dados,
              });
            else
              await this.fail(item, claim, {
                code: answer.codigo!,
                status: answer.status,
                message: answer.mensagem,
              });
          }
        } catch (error) {
          for (const item of sent)
            await this.fail(item, claim, errorInfo(error));
          break;
        }
      }
    } catch (error) {
      this.publish({error: errorInfo(error).message});
    } finally {
      this.publish({syncing: false});
      await this.refresh();
    }
  }
  private async fail(
    item: QueuedCapture,
    claim: string,
    error: {code: string; status?: number; message: string},
  ) {
    const auth =
      error.status === 401 ||
      [
        'SESSAO_NECESSARIA',
        'OPERADOR_DIVERGENTE',
        'API_DIVERGENTE',
        'SESSAO_ALTERADA',
      ].includes(error.code);
    const conflict = error.status === 409;
    const definitive =
      error.status !== undefined &&
      error.status >= 400 &&
      error.status < 500 &&
      ![401, 408, 429].includes(error.status);
    await this.store.settle(item.id, claim, {
      state: auth
        ? 'AUTH_REQUIRED'
        : conflict
        ? 'CONFLICT'
        : definitive
        ? 'FAILED'
        : 'RETRY',
      errorCode: error.code,
      message: error.message,
      nextAttemptAt:
        this.now() + Math.min(300000, 1000 * 2 ** Math.min(item.attempts, 9)),
    });
  }
  private decisionRefresh?: Promise<void>;
  refreshDecisions() {
    this.decisionRefresh ??= this.fetchDecisions().finally(() => {
      this.decisionRefresh = undefined;
    });
    return this.decisionRefresh;
  }
  private async fetchDecisions() {
    const owner = this.context();
    if (!owner?.canSend) return;
    const pending = (await this.store.list(owner)).filter(
      item => item.state === 'STORED' && item.businessState === 'PENDING',
    );
    for (const item of pending) {
      const result = await this.api.request<Decision>('/eventos/' + item.id, {
        expectedUserId: owner.userId,
        expectedBaseUrl: owner.baseUrl,
      });
      if (!sameOwner(owner, this.context()) || !decision(result)) break;
      await this.store.updateDecision(owner, item.id, result);
    }
    await this.refresh();
  }
}
