export class MaxSizeReached extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxSizeReached';
  }
}
