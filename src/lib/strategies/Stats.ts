export interface Stats {
  /**
   * Tells how many time cache hits were successful
   */
  hits: number;
  /**
   * Tells how many times cache hits were unsuccessful
   */
  misses: number;
}
