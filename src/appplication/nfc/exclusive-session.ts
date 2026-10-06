import {NfcFailure} from '../../domain/nfc/failure';

export interface SessionScope {
  checkpoint(): void;
  step<T>(action: () => Promise<T>): Promise<T>;
  onClose(close: () => Promise<void>): void;
}

export interface SessionScheduler {
  schedule(milliseconds: number, callback: () => void): () => void;
}

interface Operation {
  failure?: NfcFailure;
  abort(error: NfcFailure): void;
  stopTimer(): void;
  close?: () => Promise<void>;
  closing?: Promise<void>;
}

/** One owner until the native operation AND its cleanup finish, even on timeout. */
export class ExclusiveNfcSession {
  private active?: Operation;

  constructor(
    private readonly scheduler: SessionScheduler,
    private readonly timeoutMilliseconds = 45000,
  ) {}

  run<T>(job: (scope: SessionScope) => Promise<T>): Promise<T> {
    if (this.active) {
      return Promise.reject(
        new NfcFailure(
          'NFC_BUSY',
          'Uma sessão NFC ainda está em andamento. Aguarde o encerramento.',
        ),
      );
    }
    let abort!: (error: NfcFailure) => void;
    const aborted = new Promise<never>((_, reject) => {
      abort = reject;
    });
    const operation: Operation = {abort, stopTimer: () => {}};
    this.active = operation;
    operation.stopTimer = this.scheduler.schedule(
      this.timeoutMilliseconds,
      () => {
        this.abort(
          operation,
          new NfcFailure(
            'NFC_TIMEOUT',
            'O tempo de leitura terminou. Aproxime a etiqueta e tente novamente. Se estava gravando, confira o conteúdo antes de ativar o vínculo.',
          ),
        );
      },
    );
    const checkpoint = () => {
      if (operation.failure) {
        throw operation.failure;
      }
    };
    const scope: SessionScope = {
      checkpoint,
      async step(action) {
        checkpoint();
        const result = await action();
        checkpoint();
        return result;
      },
      onClose: close => {
        operation.close = close;
        if (operation.failure) {
          void this.close(operation);
        }
      },
    };
    const work = Promise.resolve().then(async () => {
      try {
        checkpoint();
        const result = await job(scope);
        checkpoint();
        return result;
      } finally {
        operation.stopTimer();
        await this.close(operation);
        if (this.active === operation) {
          this.active = undefined;
        }
      }
    });
    // The race observes late failures; timeout never releases ownership early.
    return Promise.race([work, aborted]);
  }

  async cancel(): Promise<void> {
    if (!this.active) {
      return;
    }
    const operation = this.active;
    this.abort(
      operation,
      new NfcFailure(
        'NFC_CANCELLED',
        'Leitura cancelada. Você pode iniciar uma nova leitura após o encerramento.',
      ),
    );
    await this.close(operation);
  }

  private abort(operation: Operation, error: NfcFailure): void {
    if (operation.failure) {
      return;
    }
    operation.failure = error;
    operation.stopTimer();
    operation.abort(error);
    void this.close(operation);
  }

  private close(operation: Operation): Promise<void> {
    if (!operation.close) {
      return Promise.resolve();
    }
    operation.closing ??= Promise.resolve()
      .then(operation.close)
      .catch(() => {});
    return operation.closing;
  }
}
