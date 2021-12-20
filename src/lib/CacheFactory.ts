import {CacheStore} from './CacheStore';
import {NotFound} from './common/errors/NotFound';

export class CacheFactory {
  static #stores: Map<string, CacheStore<unknown, unknown>>;
  static addStore(key: string, store: CacheStore<unknown, unknown>) {
    this.#stores.set(key, store);
  }

  static getStore(key: string): CacheStore<unknown, unknown> {
    const store = this.#stores.get(key);

    if (!store) throw new NotFound('Cache Store does not exist');

    return store;
  }

  static removeStore(key: string): boolean {
    return this.#stores.delete(key);
  }
}
