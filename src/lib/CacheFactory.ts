import {CacheStore} from './CacheStore';

export class CacheFactory {
  static #stores: {[key: string]: CacheStore<unknown, unknown>};

  static addStore(key: string, store: CacheStore<unknown, unknown>) {
    this.#stores[key] = store;
  }

  static getStore(key: string): CacheStore<unknown, unknown> {
    return this.#stores[key];
  }
}
