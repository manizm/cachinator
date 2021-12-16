export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: Error;
  private _value?: T;

  private constructor(isSuccess: boolean, error?: Error, value?: T) {
    if (isSuccess && error) {
      throw new Error(`InvalidOperation: A result cannot be 
        successful and contain an error`);
    }
    if (!isSuccess && !error) {
      throw new Error(`InvalidOperation: A failing result 
        needs to contain an error message`);
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;
    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cant retrieve the value from a failed result.');
    }

    if (this._value === undefined) {
      throw new Error('InvalidOperation: A value cannot be undefined');
    }

    return this._value;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: Error): Result<U> {
    return new Result<U>(false, error);
  }
}
