import {BaseCacheStrategy} from '../BaseCacheStrategy';
import {InvalidArgument} from '../../common/errors/InvalidArgument';
import {MaxSizeReached} from '../../common/errors/MaxSizeReached';
import {MemCacheOptions} from './MemCacheOptions';
import {Stats} from './Stats';

const DEFAULT_TTL_TIMEOUT = 3600000;

/**
 * In memory cache store
 * @typeParam DT - data type of the value that is being stored
 * @typeParam CKT - Cache key type
 * @public
 */
export class MemoryStore<DT, CKT> implements BaseCacheStrategy<DT, CKT> {
  /**
   * Options for memory cache type store
   * @internal
   */
  #options: MemCacheOptions;

  /**
   * stored keys that should be expired. Used in TTL validation
   * @internal
   */
  #expiringKeys: Map<CKT, number>;

  /**
   * Cached data
   * @internal
   */
  #storeData: Map<CKT, DT>;

  /**
   * hits/misses stats of the store
   * @internal
   */
  #stats: Stats;

  /**
   * defines timer interval for expiry invalidation
   * @internal
   */
  #ttlTimeout: NodeJS.Timeout | undefined;

  constructor(options: MemCacheOptions) {
    this.#options = options;
    this.#storeData = new Map();
    this.#expiringKeys = new Map();
    this.#stats = this.#initStats();
    this.#startTTLValidation();
  }

  /**
   * initialzes and returns default stats for cache store
   * @internal
   * @returns default stats
   */
  #initStats(): Stats {
    return {
      hits: 0,
      misses: 0,
    };
  }

  /**
   * Checks if currentTime has passed key's TTL
   * @param  keyTTL
   * @returns boolean indicating if key has expired or not
   */
  #keyIsExpired(keyTTL: number | undefined): boolean {
    if (!keyTTL) {
      return false;
    }

    const now = new Date();
    return keyTTL <= now.getTime();
  }

  /**
   * If default ttl options are provided, it will start timeout to periodically
   * check the expired keys and remove them from the store
   * @internal
   */
  #startTTLValidation() {
    if (this.#ttlTimeout) return;
    if (this.#options.defaultTTL) {
      const timer = this.#options.ttlCheckTimer || DEFAULT_TTL_TIMEOUT;

      this.#ttlTimeout = setInterval(() => {
        this.#expiringKeys.forEach((keyTTL, key) => {
          if (this.#keyIsExpired(keyTTL)) {
            this.del(key);
          }
        });
      }, timer);
    }
  }

  /**
   * Used to stop the ttl timeout before restarting
   * @internal
   */
  #stopTTLValidation() {
    if (this.#ttlTimeout) clearInterval(this.#ttlTimeout);
    this.#ttlTimeout = undefined;
  }

  /**
   * Used to calculate hit or miss stats for store
   * @internal
   * @param data should be possibly return value of store's get method
   */
  #handleStats(data: DT | undefined): void {
    if (!data) {
      ++this.#stats.misses;
      return;
    }

    ++this.#stats.hits;
  }

  /**
   * gets the value from cache store by key
   * @param key key for the key/value pair in store map
   * @returns value from the cache of type DT or undefined if nothing found
   */
  get(key: CKT): DT | undefined {
    if (!key) {
      throw new InvalidArgument('cannot get value without a key');
    }

    if (this.#keyIsExpired(this.#expiringKeys.get(key))) {
      this.del(key);
    }

    const data = this.#storeData.get(key);

    this.#handleStats(data);

    return data;
  }

  /**
   * Sets the data in the cache store
   * @param key key for the key/value pair in store map
   * @param data data to be set in cache store
   * @param ignoreTTL passing this "true" will make sure that data is never expired. Will ignore "#options.defaultTTL"
   * @param ttl if passed, it will set a custom expiration time for the key/value in store
   * @returns boolean indicating, if storing the key/value in store pair was successful or not
   */
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
        this.#expiringKeys.set(key, ttl);
      } catch (err) {
        // revert stored key/value if setting expiration fails
        this.#storeData.delete(key);
        throw err;
      }
    }

    return true;
  }

  /**
   * Deletes the key from cache store
   * @param key key for the key/value pair in store map
   * @returns a boolean, indicating if deleting the key/value was successful or not
   */
  del(key: CKT): boolean {
    if (key === undefined) {
      throw new InvalidArgument('cannot delete value without a key');
    }

    return this.#storeData.delete(key);
  }

  /**
   * Flushes / removes all the data from store, resets the stats and restarts the key/value expiry timeout
   * @returns a boolean, indicating if flushing the whole store was successful or not
   */
  flushAll(): boolean {
    this.#stopTTLValidation();

    this.#storeData = new Map();
    this.#expiringKeys = new Map();
    this.#stats = this.#initStats();

    this.#startTTLValidation();

    return true;
  }

  /**
   * gets all the keys that are present in store
   * @returns all the keys from the store
   */
  getKeys(): CKT[] {
    return [...this.#storeData.keys()];
  }

  /**
   * returns size(length) of the store
   * @returns how many key/value pairs are stored in store
   */
  getSize(): number {
    return this.#storeData.size;
  }

  /**
   * returns succuessful hit count
   * @returns a number, indicating succesfully fetched value from store
   */
  getHits(): number {
    return this.#stats.hits;
  }

  /**
   * returns unsuccessful hit count
   * @returns a number, indicating total amount of time fetching data from store was unsuccessful
   */
  getMisses(): number {
    return this.#stats.misses;
  }
}
