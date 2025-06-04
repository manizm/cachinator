export interface BaseCacheStrategy<DataType, CacheKeyType> {
  /**
   * Returns number of time cache fetch by key was successful
   */
  getHits(): Number;

  /**
   * Returns number of time cache fetch by key was unsuccessful
   */
  getMisses(): Number;

  /**
   * returns cached item from store by key
   * @param key identifier of cached data in store
   */
  get(key: CacheKeyType): DataType | undefined;

  /**
   * sets data in the cache store
   * @param key dentifier of data to be cached in store
   * @param data to be cached data
   * @param ignoreTTL bypass and ignore default TTL setup in store options
   * @param ttl? optional expiry date for stored key
   */
  set(
    key: CacheKeyType,
    data: DataType,
    ignoreTTL?: boolean,
    ttl?: number,
  ): boolean;

  /**
   * hard deletes the identified data from store
   * @param key identifier of cached data in store
   */
  del(key: CacheKeyType): boolean;

  /**
   * Remove all the keys/data from the store
   */
  flushAll(): boolean;

  /**
   * returns total number of keys in the store
   */
  getSize(): number;
}
