import type {Api} from '../traceability/workflow';
import type {Observation, Decision} from '../../domain/traceability/types';
import type {
  CaptureContext,
  CaptureOwner,
  QueuedCapture,
} from '../../domain/offline/types';
import {OfflineError} from '../../domain/offline/types';
import type {
  Attempt,
  ExperimentPlan,
  ExperimentRecord,
  ExperimentStorage,
  MonotonicClock,
  ExperimentalCapture,
} from '../../domain/experimentation/types';
const same = (a: CaptureOwner, b: CaptureOwner | null) =>
  !!b && a.userId === b.userId && a.baseUrl === b.baseUrl;
export class ExperimentJournal {
  private flushWork?: Promise<void>;
  constructor(
    private readonly storage: ExperimentStorage,
    private readonly context: () => CaptureContext | null,
    private readonly api: Api,
    private readonly id: () => string,
    readonly clock: MonotonicClock,
    private readonly device: () => Promise<string>,
    private readonly wall: () => number = Date.now,
  ) {}
  private owner() {
    const o = this.context();
    if (!o?.canCapture)
      throw new OfflineError(
        'IDENTIDADE_NECESSARIA',
        'Entre com um operador para executar o ensaio.',
      );
    return {...o};
  }
  private record(
    attempt: Attempt,
    stage: ExperimentRecord['stage'],
    observationId: string | null = null,
    durationMs: number | null = null,
    boundary: ExperimentRecord['boundary'] = 'INSTANTE',
    code: string | null = null,
  ): ExperimentRecord {
    return {
      id: this.id(),
      trialId: attempt.plan.id,
      attemptId: attempt.id,
      stage,
      observationId,
      deviceId: attempt.plan.deviceId,
      occurredAt: new Date(this.wall()).toISOString(),
      clockId: this.clock.originId,
      monotonicMs: this.clock.nowMs(),
      durationMs,
      boundary,
      code,
    };
  }
  async state() {
    const o = this.context();
    if (!o) return {plan: null, hold: false, pending: 0, sent: 0, failed: 0};
    await this.recover(o);
    const choice = await this.storage.selection(o);
    return {...choice, ...(await this.storage.counts(o))};
  }
  async select(plan: ExperimentPlan | null, hold = false) {
    const owner = this.owner();
    if (
      plan &&
      (plan.mode !== 'LEITURA_FISICA' ||
        plan.deviceId !== (await this.device()))
    )
      throw new OfflineError(
        'ROTEIRO_INCOMPATIVEL',
        'Selecione uma tentativa física planejada para este aparelho.',
      );
    await this.storage.select(owner, plan, hold);
  }
  private recoverWork = new Map<string, Promise<void>>();
  private recover(owner: CaptureOwner) {
    const key = owner.baseUrl + '/' + owner.userId;
    let task = this.recoverWork.get(key);
    if (!task) {
      task = (async () => {
        const records = await this.storage.records(owner);
        for (const r of records.filter(
          start =>
            start.stage === 'TENTATIVA_INICIADA' &&
            start.clockId !== this.clock.originId,
        )) {
          if (
            records.some(
              e =>
                e.attemptId === r.attemptId &&
                [
                  'LEITURA_OK',
                  'LEITURA_FALHOU',
                  'LEITURA_INTERROMPIDA',
                ].includes(e.stage),
            )
          )
            continue;
          await this.storage.put(owner, {
            ...r,
            id: this.id(),
            stage: 'LEITURA_INTERROMPIDA',
            occurredAt: new Date(this.wall()).toISOString(),
            clockId: this.clock.originId,
            monotonicMs: this.clock.nowMs(),
            durationMs: null,
            boundary: 'INSTANTE',
            code: 'REINICIO',
          });
        }
      })().catch(e => {
        this.recoverWork.delete(key);
        throw e;
      });
      this.recoverWork.set(key, task);
    }
    return task;
  }
  async start(eventType: string): Promise<Attempt | null> {
    const owner = this.owner();
    await this.recover(owner);
    const {plan} = await this.storage.selection(owner);
    if (!plan) return null;
    if (
      plan.eventType !== eventType ||
      plan.deviceId !== (await this.device()) ||
      plan.mode !== 'LEITURA_FISICA'
    )
      throw new OfflineError(
        'ROTEIRO_INCOMPATIVEL',
        'A etapa ou o aparelho não corresponde ao roteiro selecionado em Envios.',
      );
    const attempt = {owner, plan, id: this.id()};
    await this.storage.put(owner, this.record(attempt, 'TENTATIVA_INICIADA'));
    return attempt;
  }
  async finish(
    attempt: Attempt | null,
    startMs: number,
    success: boolean,
    code: string | null = null,
  ) {
    if (!attempt) return;
    await this.storage.put(
      attempt.owner,
      this.record(
        attempt,
        success ? 'LEITURA_OK' : 'LEITURA_FALHOU',
        null,
        Math.max(0, this.clock.nowMs() - startMs),
        'SESSAO_NFC_ATE_EVIDENCIA',
        code,
      ),
    );
  }
  async capture(
    attempt: Attempt | null,
    payload: Observation,
  ): Promise<ExperimentalCapture | undefined> {
    if (!attempt) return undefined;
    if (
      !same(attempt.owner, this.context()) ||
      attempt.plan.provisioningId !== payload.provisionamentoId ||
      attempt.plan.eventType !== payload.tipo ||
      attempt.plan.deviceId !== payload.dispositivoId
    )
      throw new OfflineError(
        'ROTEIRO_INCOMPATIVEL',
        'A captura não corresponde ao roteiro; confira a etiqueta, a etapa e o operador.',
      );
    return {
      plan: attempt.plan,
      record: this.record(attempt, 'CAPTURA_LOCAL', payload.id),
    };
  }
  async allowed() {
    const owner = this.context();
    return !owner || (await this.storage.selection(owner)).hold !== true;
  }
  async confirmedLocal(item: QueuedCapture) {
    const a = this.attempt(item);
    if (!a) return;
    const records = await this.storage.records(a.owner);
    if (
      records.some(r => r.attemptId === a.id && r.stage === 'CONFIRMACAO_LOCAL')
    )
      return;
    const start = records.find(
      r => r.attemptId === a.id && r.stage === 'TENTATIVA_INICIADA',
    );
    const elapsed =
      start?.clockId === this.clock.originId
        ? Math.max(0, this.clock.nowMs() - start.monotonicMs)
        : null;
    await this.storage.put(
      a.owner,
      this.record(
        a,
        'CONFIRMACAO_LOCAL',
        item.id,
        elapsed,
        'INICIO_ATE_CONFIRMACAO_LOCAL',
        elapsed === null ? 'SEM_RELOGIO_ORIGINAL' : 'OK',
      ),
    );
  }
  private attempt(item: QueuedCapture): Attempt | null {
    const exp = item.metadata.experiment;
    return exp
      ? {owner: item.owner, plan: exp.plan, id: exp.record.attemptId}
      : null;
  }
  async sendStart(item: QueuedCapture) {
    const a = this.attempt(item);
    if (a)
      await this.storage.put(
        a.owner,
        this.record(a, 'ENVIO_INICIADO', item.id),
      );
  }
  async sendEnd(
    item: QueuedCapture,
    startMs: number,
    success: boolean,
    result?: Decision,
    endMs = this.clock.nowMs(),
  ) {
    const a = this.attempt(item);
    if (!a) return;
    await this.storage.put(
      a.owner,
      this.record(
        a,
        success ? 'ENVIO_CONFIRMADO' : 'ENVIO_FALHOU',
        item.id,
        Math.max(0, endMs - startMs),
        'ENVIO_ATE_RESPOSTA',
        success ? 'OK' : 'REDE_INDISPONIVEL',
      ),
    );
    if (result) await this.decision(item, result);
  }
  async release(items: QueuedCapture[]) {
    const owner = this.owner();
    const releasedAt = this.clock.nowMs();
    for (const item of items.filter(
      i =>
        same(owner, i.owner) &&
        i.metadata.experiment &&
        !(i.state === 'STORED' && i.businessState !== 'PENDING'),
    )) {
      const a = this.attempt(item)!;
      const prior = (await this.storage.records(owner)).some(
        r => r.attemptId === a.id && r.stage === 'COMUNICACAO_LIBERADA',
      );
      if (!prior)
        await this.storage.put(owner, {
          ...this.record(a, 'COMUNICACAO_LIBERADA', item.id),
          monotonicMs: releasedAt,
        });
    }
    const selected = await this.storage.selection(owner);
    await this.storage.select(owner, selected.plan, false);
  }
  async decision(item: QueuedCapture, result: Decision) {
    const a = this.attempt(item);
    if (!a) return;
    const records = await this.storage.records(a.owner);
    // At most one marker per final decision; original operational receipt stays immutable.
    if (result.decisao.status === 'PENDENTE') return;
    const start = records.find(
      r => r.attemptId === a.id && r.stage === 'TENTATIVA_INICIADA',
    );
    if (
      !records.some(
        r => r.attemptId === a.id && r.stage === 'CONFIRMACAO_FINAL',
      )
    ) {
      const elapsed =
        start?.clockId === this.clock.originId
          ? Math.max(0, this.clock.nowMs() - start.monotonicMs)
          : null;
      await this.storage.put(
        a.owner,
        this.record(
          a,
          'CONFIRMACAO_FINAL',
          item.id,
          elapsed,
          'INICIO_ATE_DECISAO_FINAL',
          elapsed === null ? 'SEM_RELOGIO_ORIGINAL' : 'OK',
        ),
      );
    }
    if (
      records.some(
        r => r.attemptId === a.id && r.stage === 'RECONCILIACAO_CONCLUIDA',
      )
    )
      return;
    const release = records.find(
      r => r.attemptId === a.id && r.stage === 'COMUNICACAO_LIBERADA',
    );
    if (!release) return; // Online reads have send timings, no invented offline release boundary.
    await this.storage.put(
      a.owner,
      this.record(a, 'DECISAO_CONSULTADA', item.id),
    );
    const duration =
      release.clockId === this.clock.originId
        ? Math.max(0, this.clock.nowMs() - release.monotonicMs)
        : null;
    await this.storage.put(
      a.owner,
      this.record(
        a,
        'RECONCILIACAO_CONCLUIDA',
        item.id,
        duration,
        'LIBERACAO_ATE_DECISAO_FINAL',
        duration === null ? 'SEM_RELOGIO_ORIGINAL' : 'OK',
      ),
    );
  }
  flush() {
    this.flushWork ??= this.flushOnce().finally(() => {
      this.flushWork = undefined;
    });
    return this.flushWork;
  }
  private async flushOnce() {
    const owner = this.context();
    if (!owner?.canSend || !(await this.allowed())) return;
    await this.recover(owner);
    for (const record of await this.storage.pending(owner, this.wall())) {
      if (!same(owner, this.context()) || !this.context()?.canSend) break;
      try {
        await this.api.request('/experimentos/registros', {
          method: 'POST',
          body: record,
          expectedUserId: owner.userId,
          expectedBaseUrl: owner.baseUrl,
        });
        await this.storage.sent(owner, record.id);
      } catch (e) {
        const status = (e as {status?: number})?.status;
        await this.storage.retry(
          owner,
          record.id,
          this.wall(),
          !!status && [400, 403, 404, 409, 422].includes(status),
        );
        if (!status || status === 401 || status >= 500) break;
      }
    }
  }
}
