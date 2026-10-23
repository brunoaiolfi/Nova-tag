export class AdministrationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AdministrationError';
  }
}
