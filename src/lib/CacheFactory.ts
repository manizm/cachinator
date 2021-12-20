import {CacheStore} from './CacheStore';
import {DuplicateKey} from './common/errors/DuplicateKey';
import {InvalidArgument} from './common/errors/InvalidArgument';
import {NotFound} from './common/errors/NotFound';

export class CacheFactory {
  #stores: Map<string, CacheStore<unknown, unknown>>;

  constructor() {
    this.#stores = new Map();
  }

  addStore(key: string, store: CacheStore<unknown, unknown>) {
    if (typeof key !== 'string') {
      throw new InvalidArgument('key must be a string for adding cache store');
    }

    // don't let the users implicitly override an added store
    if (this.getKeys().includes(key)) {
      throw new DuplicateKey(`key: ${key} already exists`);
    }

    this.#stores.set(key, store);
  }

  getStore(key: string): CacheStore<unknown, unknown> {
    if (typeof key !== 'string') {
      throw new InvalidArgument('a valid key is required to get store');
    }

    const store = this.#stores.get(key);

    if (!store) throw new NotFound('Cache Store does not exist');

    return store;
  }

  getKeys(): string[] {
    return [...this.#stores.keys()];
  }

  removeStore(key: string): boolean {
    if (typeof key !== 'string') {
      throw new InvalidArgument('a valid key is required to delete a store');
    }

    return this.#stores.delete(key);
  }
}
