export class OfflineError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}
