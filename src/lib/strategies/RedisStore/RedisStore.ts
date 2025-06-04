import {BaseCacheStrategy} from '../BaseCacheStrategy';
import {InvalidArgument} from '../../common/errors/InvalidArgument';
import {Stats} from '../MemoryStore/Stats';

export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushDb(): Promise<unknown>;
}

export interface RedisStoreOptions {
  defaultTTL?: number;
}

export class RedisStore<DT> implements BaseCacheStrategy<DT, string> {
  #client: RedisClientLike;
  #stats: Stats;
  #options: RedisStoreOptions;

  constructor(client: RedisClientLike, options: RedisStoreOptions = {}) {
    this.#client = client;
    this.#options = options;
    this.#stats = {hits: 0, misses: 0};
  }

  /**
   * Exposes the underlying redis client for advanced use cases
   * @returns the internal client instance
   */
  getClient(): RedisClientLike {
    return this.#client;
  }

  getHits(): number {
    return this.#stats.hits;
  }

  getMisses(): number {
    return this.#stats.misses;
  }

  async get(key: string): Promise<DT | undefined> {
    if (!key) {
      throw new InvalidArgument('cannot get value without a key');
    }

    const data = await this.#client.get(key);
    if (data === null) {
      ++this.#stats.misses;
      return undefined;
    }

    ++this.#stats.hits;
    try {
      return JSON.parse(data) as DT;
    } catch {
      return (data as unknown) as DT;
    }
  }

  async set(
    key: string,
    data: DT,
    ignoreTTL = false,
    ttl?: number,
  ): Promise<boolean> {
    if (!key) {
      throw new InvalidArgument('cannot set value without a key');
    }
    if (data === undefined || data === null) {
      throw new InvalidArgument('cannot set undefined or null');
    }

    const payload = JSON.stringify(data);
    const args: unknown[] = [];

    if (!ignoreTTL) {
      if (!ttl && this.#options.defaultTTL) {
        ttl = this.#options.defaultTTL;
      }
      if (ttl) {
        args.push('PX', ttl);
      }
    }

    await this.#client.set(key, payload, ...args);
    return true;
  }

  async del(key: string): Promise<boolean> {
    if (!key) {
      throw new InvalidArgument('cannot delete value without a key');
    }
    const res = await this.#client.del(key);
    return res > 0;
  }

  async flushAll(): Promise<boolean> {
    await this.#client.flushDb();
    this.#stats = {hits: 0, misses: 0};
    return true;
  }

  async getSize(): Promise<number> {
    const keys = await this.#client.keys('*');
    return keys.length;
  }

  async getKeys(): Promise<string[]> {
    return this.#client.keys('*');
  }
}

