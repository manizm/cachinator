import {CacheStore} from '../CacheStore';
import {InvalidArgument} from '../common/errors/InvalidArgument';
import {MaxSizeReached} from '../common/errors/MaxSizeReached';
import {MemCacheOptions} from './MemCacheOptions';
import {Stats} from './Stats';

const DEFAULT_TTL_TIMEOUT = 1000;

export class MemCache<DT, CKT> implements CacheStore<DT, CKT> {
  #options: MemCacheOptions;
  #expiringKeys: Map<number, CKT>;
  #storeData: Map<CKT, DT>;
  #stats: Stats;
  #ttlTimeout: NodeJS.Timeout | undefined;

  constructor(options: MemCacheOptions) {
    this.#options = options;
    this.#storeData = new Map();
    this.#expiringKeys = new Map();
    this.#stats = this.#initStats();
    this.#startTTLValidation();
  }

  #initStats(): Stats {
    return {
      hits: 0,
      misses: 0,
    };
  }

  #startTTLValidation() {
    if (this.#ttlTimeout) return;
    if (this.#options.defaultTTL) {
      const timer = this.#options.ttlCheckTimer || DEFAULT_TTL_TIMEOUT;

      this.#ttlTimeout = setTimeout(() => {
        const now = new Date();

        this.#expiringKeys.forEach((value, key) => {
          if (now.getTime() <= key) {
            this.del(value);
          }
        });
      }, timer);
    }
  }

  #stopTTLValidation() {
    if (this.#ttlTimeout) clearTimeout(this.#ttlTimeout);
    this.#ttlTimeout = undefined;
  }

  #handleStats(data: DT | undefined): void {
    if (!data) {
      ++this.#stats.misses;
      return;
    }

    ++this.#stats.hits;
  }

  get(key: CKT): DT | undefined {
    if (!key) {
      throw new InvalidArgument('cannot get value without a key');
    }

    const data = this.#storeData.get(key);

    this.#handleStats(data);

    return data;
  }

  set(key: CKT, data: DT, ignoreTTL = false, ttl?: number): boolean {
    if (key === undefined) {
      throw new InvalidArgument('cannot set value without a key');
    }

    if (data === undefined) {
      throw new InvalidArgument('cannot set undefined or null');
    }

    if (this.#options.maxKeys > 0 && this.getSize() === this.#options.maxKeys) {
      throw new MaxSizeReached(
        `max keys limit: ${
          this.#options.maxKeys
        } exhausted. Cannot add any new key`
      );
    }

    if (!ignoreTTL) {
      if (!ttl && this.#options.defaultTTL) {
        ttl = this.#options.defaultTTL;
      }
    }

    this.#storeData.set(key, data);

    if (!ignoreTTL && ttl) {
      try {
        this.#expiringKeys.set(ttl, key);
      } catch (err) {
        // revert stored key/value if setting expiration fails
        this.#storeData.delete(key);
        throw err;
      }
    }

    return true;
  }

  del(key: CKT): boolean {
    if (key === undefined) {
      throw new InvalidArgument('cannot delete value without a key');
    }

    return this.#storeData.delete(key);
  }

  flushAll(): boolean {
    this.#stopTTLValidation();

    this.#storeData = new Map();
    this.#expiringKeys = new Map();
    this.#stats = this.#initStats();

    this.#startTTLValidation();

    return true;
  }

  getKeys(): CKT[] {
    return [...this.#storeData.keys()];
  }

  getSize(): number {
    return this.#storeData.size;
  }

  getHits(): number {
    return this.#stats.hits;
  }

  getMisses(): number {
    return this.#stats.misses;
  }
}
