export class DuplicateKey extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateKey';
  }
}
