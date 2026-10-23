import type {PhysicalNfc} from '../ports/app-services';
import type {ExperimentJournal} from '../experimentation/journal';
import type {Reading} from '../../domain/traceability/reading';
import type {Attempt} from '../../domain/experimentation/attempt';

export interface PhysicalReadingResult {
  reading: Reading;
  capturedAt: string;
  attempt: Attempt | null;
}
export interface PhysicalReadingTask {
  result: Promise<PhysicalReadingResult>;
  cancel(): void;
  isCancelled(): boolean;
}
/** A command initiated by a user; journal boundaries surround only the physical session. */
export function startPhysicalReading(
  nfc: PhysicalNfc,
  journal: ExperimentJournal,
  options: {write?: {uid: string; reference: string}; experimentType?: string},
  now: () => number = Date.now,
): PhysicalReadingTask {
  let cancelled = false;
  let timedOut = false;
  const cancelNativeRead = () => {
    void nfc.cancelPhysicalRead().catch(() => {});
  };
  async function perform(): Promise<PhysicalReadingResult> {
    let attempt: Attempt | null = null;
    let startedAt = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let terminalSaved = false;
    try {
      if (options.experimentType)
        attempt = await journal.start(options.experimentType);
      startedAt = journal.clock.nowMs();
      if (cancelled) {
        await journal.finish(attempt, startedAt, false, 'NFC_CANCELADO');
        terminalSaved = true;
        throw new Error('Leitura cancelada.');
      }
      if (attempt?.plan.timeoutMs)
        timeout = setTimeout(() => {
          timedOut = true;
          cancelNativeRead();
        }, attempt.plan.timeoutMs);
      const reading = await nfc.readPhysicalTag(options.write);
      const capturedAt = new Date(now()).toISOString();
      if (timeout) clearTimeout(timeout);
      await journal.finish(
        attempt,
        startedAt,
        !timedOut && !cancelled,
        timedOut ? 'NFC_TIMEOUT' : cancelled ? 'NFC_CANCELADO' : 'OK',
      );
      terminalSaved = true;
      if (timedOut)
        throw new Error('Tempo de leitura esgotado. Tente novamente.');
      return {reading, capturedAt, attempt};
    } catch (error) {
      if (!terminalSaved) {
        const nativeTimeout =
          error !== null &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'NFC_TIMEOUT';
        await journal
          .finish(
            attempt,
            startedAt,
            false,
            timedOut || nativeTimeout
              ? 'NFC_TIMEOUT'
              : cancelled
              ? 'NFC_CANCELADO'
              : 'NFC_ERRO',
          )
          .catch(() => {});
      }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return {
    result: perform(),
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cancelNativeRead();
    },
    isCancelled: () => cancelled,
  };
}
