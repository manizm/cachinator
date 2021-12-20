import {CacheStore} from './CacheStore';
import {NotFound} from './common/errors/NotFound';

export class CacheFactory {
  #stores: Map<string, CacheStore<unknown, unknown>>;

  constructor() {
    this.#stores = new Map();
  }

  addStore(key: string, store: CacheStore<unknown, unknown>) {
    this.#stores.set(key, store);
  }

  getStore(key: string): CacheStore<unknown, unknown> {
    const store = this.#stores.get(key);

    if (!store) throw new NotFound('Cache Store does not exist');

    return store;
  }

  removeStore(key: string): boolean {
    return this.#stores.delete(key);
  }
}
