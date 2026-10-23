import type {Api} from '../auth/ports/authenticated-api';
import type {Observation} from '../../domain/traceability/observation';
import type {Decision} from '../../domain/traceability/decision';
import type {CaptureContext} from '../offline/capture-context.types';
import type {CaptureOwner} from '../../domain/offline/owner';
import type {QueuedCapture} from '../../domain/offline/capture';
import {OfflineError} from '../offline/offline-error';
import type {
  Attempt,
  ExperimentalCapture,
} from '../../domain/experimentation/attempt';
import type {ExperimentPlan} from '../../domain/experimentation/plan';
import type {ExperimentRecord} from '../../domain/experimentation/record';
import type {ExperimentStorage} from './ports/experiment-storage';
import type {MonotonicClock} from './ports/monotonic-clock';
const sameCaptureOwner = (
  expectedOwner: CaptureOwner,
  actualOwner: CaptureOwner | null,
) =>
  !!actualOwner &&
  expectedOwner.userId === actualOwner.userId &&
  expectedOwner.baseUrl === actualOwner.baseUrl;
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
    const captureContext = this.context();
    if (!captureContext?.canCapture)
      throw new OfflineError(
        'IDENTIDADE_NECESSARIA',
        'Entre com um operador para executar o ensaio.',
      );
    return {...captureContext};
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
    const captureContext = this.context();
    if (!captureContext)
      return {plan: null, hold: false, pending: 0, sent: 0, failed: 0};
    await this.recover(captureContext);
    const selectionState = await this.storage.selection(captureContext);
    return {...selectionState, ...(await this.storage.counts(captureContext))};
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
        for (const experimentRecord of records.filter(
          start =>
            start.stage === 'TENTATIVA_INICIADA' &&
            start.clockId !== this.clock.originId,
        )) {
          if (
            records.some(
              error =>
                error.attemptId === experimentRecord.attemptId &&
                [
                  'LEITURA_OK',
                  'LEITURA_FALHOU',
                  'LEITURA_INTERROMPIDA',
                ].includes(error.stage),
            )
          )
            continue;
          await this.storage.put(owner, {
            ...experimentRecord,
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
      })().catch(error => {
        this.recoverWork.delete(key);
        throw error;
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
      !sameCaptureOwner(attempt.owner, this.context()) ||
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
    const attempt = this.attempt(item);
    if (!attempt) return;
    const records = await this.storage.records(attempt.owner);
    if (
      records.some(
        experimentRecord =>
          experimentRecord.attemptId === attempt.id &&
          experimentRecord.stage === 'CONFIRMACAO_LOCAL',
      )
    )
      return;
    const start = records.find(
      experimentRecord =>
        experimentRecord.attemptId === attempt.id &&
        experimentRecord.stage === 'TENTATIVA_INICIADA',
    );
    const elapsed =
      start?.clockId === this.clock.originId
        ? Math.max(0, this.clock.nowMs() - start.monotonicMs)
        : null;
    await this.storage.put(
      attempt.owner,
      this.record(
        attempt,
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
    const attempt = this.attempt(item);
    if (attempt)
      await this.storage.put(
        attempt.owner,
        this.record(attempt, 'ENVIO_INICIADO', item.id),
      );
  }
  async sendEnd(
    item: QueuedCapture,
    startMs: number,
    success: boolean,
    result?: Decision,
    endMs = this.clock.nowMs(),
  ) {
    const attempt = this.attempt(item);
    if (!attempt) return;
    await this.storage.put(
      attempt.owner,
      this.record(
        attempt,
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
        sameCaptureOwner(owner, i.owner) &&
        i.metadata.experiment &&
        !(i.state === 'STORED' && i.businessState !== 'PENDING'),
    )) {
      const attempt = this.attempt(item)!;
      const prior = (await this.storage.records(owner)).some(
        experimentRecord =>
          experimentRecord.attemptId === attempt.id &&
          experimentRecord.stage === 'COMUNICACAO_LIBERADA',
      );
      if (!prior)
        await this.storage.put(owner, {
          ...this.record(attempt, 'COMUNICACAO_LIBERADA', item.id),
          monotonicMs: releasedAt,
        });
    }
    const selected = await this.storage.selection(owner);
    await this.storage.select(owner, selected.plan, false);
  }
  async decision(item: QueuedCapture, result: Decision) {
    const attempt = this.attempt(item);
    if (!attempt) return;
    const records = await this.storage.records(attempt.owner);
    // At most one marker per final decision; original operational receipt stays immutable.
    if (result.decisao.status === 'PENDENTE') return;
    const start = records.find(
      experimentRecord =>
        experimentRecord.attemptId === attempt.id &&
        experimentRecord.stage === 'TENTATIVA_INICIADA',
    );
    if (
      !records.some(
        experimentRecord =>
          experimentRecord.attemptId === attempt.id &&
          experimentRecord.stage === 'CONFIRMACAO_FINAL',
      )
    ) {
      const elapsed =
        start?.clockId === this.clock.originId
          ? Math.max(0, this.clock.nowMs() - start.monotonicMs)
          : null;
      await this.storage.put(
        attempt.owner,
        this.record(
          attempt,
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
        experimentRecord =>
          experimentRecord.attemptId === attempt.id &&
          experimentRecord.stage === 'RECONCILIACAO_CONCLUIDA',
      )
    )
      return;
    const release = records.find(
      experimentRecord =>
        experimentRecord.attemptId === attempt.id &&
        experimentRecord.stage === 'COMUNICACAO_LIBERADA',
    );
    if (!release) return; // Online reads have send timings, no invented offline release boundary.
    await this.storage.put(
      attempt.owner,
      this.record(attempt, 'DECISAO_CONSULTADA', item.id),
    );
    const duration =
      release.clockId === this.clock.originId
        ? Math.max(0, this.clock.nowMs() - release.monotonicMs)
        : null;
    await this.storage.put(
      attempt.owner,
      this.record(
        attempt,
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
      if (!sameCaptureOwner(owner, this.context()) || !this.context()?.canSend)
        break;
      try {
        await this.api.request('/experimentos/registros', {
          method: 'POST',
          body: record,
          expectedUserId: owner.userId,
          expectedBaseUrl: owner.baseUrl,
        });
        await this.storage.sent(owner, record.id);
      } catch (error) {
        const status = (error as {status?: number})?.status;
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
