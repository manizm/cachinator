import {BaseCacheStrategy} from './strategies/BaseCacheStrategy';
import {DuplicateKey} from './common/errors/DuplicateKey';
import {InvalidArgument} from './common/errors/InvalidArgument';
import {NotFound} from './common/errors/NotFound';

export class CacheContainer {
  /**
   * container for all the cache stores
   */
  #stores: Map<string, BaseCacheStrategy<unknown, unknown>>;

  constructor() {
    this.#stores = new Map();
  }

  /**
   * adds a type of CacheStore to the factory container
   * @param key
   * @param store
   */
  addStore(key: string, store: BaseCacheStrategy<unknown, unknown>) {
    if (typeof key !== 'string') {
      throw new InvalidArgument('key must be a string for adding cache store');
    }

    // don't let the users implicitly override an added store
    if (this.#stores.has(key)) {
      throw new DuplicateKey(`key: ${key} already exists!`);
    }

    this.#stores.set(key, store);
  }

  /**
   * gets specific cache store from container
   * @param key
   * @returns
   */
  getStore(key: string): BaseCacheStrategy<unknown, unknown> {
    if (typeof key !== 'string') {
      throw new InvalidArgument('a valid key is required to get store');
    }

    const store = this.#stores.get(key);

    if (!store) throw new NotFound('Cache Store does not exist');

    return store;
  }

  /**
   * returns the keys of all cahce stores in container
   * @returns
   */
  getKeys(): string[] {
    return [...this.#stores.keys()];
  }

  /**
   * removes a specific store from container by key
   * @param key
   * @returns
   */
  removeStore(key: string, shouldFlush = false): boolean {
    if (typeof key !== 'string') {
      throw new InvalidArgument('a valid key is required to delete a store');
    }

    const store = this.#stores.get(key);

    if (!store) return true;

    if (shouldFlush) {
      store.flushAll();
    }

    return this.#stores.delete(key);
  }
}
