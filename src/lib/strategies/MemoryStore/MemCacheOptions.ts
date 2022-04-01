/**
 * options for cache store
 */
export interface MemCacheOptions {
  /**
   * max amount of keys allowed to store
   */
  maxKeys: number;
  /**
   * stdTTL default time in ms to live for the keys inthe store
   */
  defaultTTL: number;

  /**
   * Timer used for cache expiry invalidation
   */
  ttlCheckTimer: number;
}
