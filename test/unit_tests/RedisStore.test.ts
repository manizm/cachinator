import {CacheContainer} from '../../src/lib/CacheContainer';
import {
  RedisStore,
  RedisClientLike,
} from '../../src/lib/strategies/RedisStore/RedisStore';
import {InvalidArgument} from '../../src/lib/common/errors/InvalidArgument';

interface DataType {
  name: string;
}

class FakeRedisClient implements RedisClientLike {
  private store = new Map<string, {value: string; expiresAt?: number}>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<unknown> {
    let ttl: number | undefined;
    if (args[0] === 'PX') {
      ttl = Number(args[1]);
    }
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    this.store.set(key, {value, expiresAt});
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async keys(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pattern: string,
  ): Promise<string[]> {
    this.cleanup();
    return Array.from(this.store.keys());
  }

  async flushDb(): Promise<unknown> {
    this.store.clear();
    return 'OK';
  }

  private cleanup() {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt && v.expiresAt <= now) {
        this.store.delete(k);
      }
    }
  }
}

describe('RedisStore', () => {
  let container: CacheContainer;
  let client: FakeRedisClient;
  let storeKey: string;
  let store: RedisStore<DataType>;

  beforeEach(() => {
    container = new CacheContainer();
    client = new FakeRedisClient();
    storeKey = 'redis';
    container.addStore(storeKey, new RedisStore<DataType>(client));
    store = container.getStore(storeKey) as RedisStore<DataType>;
  });

  it('should set and get values', async () => {
    await store.flushAll();
    await store.set('a', {name: 'ali'});
    const data = await store.get('a');
    expect(data).toEqual({name: 'ali'});
    expect(store.getHits()).toBe(1);
  });

  it('should expire keys using ttl', async () => {
    jest.useFakeTimers();
    await store.flushAll();
    await store.set('b', {name: 'bob'}, false, 10);
    expect(await store.get('b')).toEqual({name: 'bob'});
    jest.advanceTimersByTime(20);
    jest.runOnlyPendingTimers();
    expect(await store.get('b')).toBeUndefined();
    expect(store.getMisses()).toBe(1);
    jest.useRealTimers();
  });

  it('should expose the underlying client', () => {
    expect(store.getClient()).toBe(client);
  });

  it('should throw error when getting with empty key', async () => {
    await expect(store.get('')).rejects.toThrow(InvalidArgument);
    await expect(store.get('')).rejects.toThrow(
      'cannot get value without a key',
    );
  });

  it('should handle non-JSON data gracefully', async () => {
    // Directly manipulate the fake client to store non-JSON data
    await client.set('nonJson', 'This is not JSON');
    const result = await store.get('nonJson');
    expect(result).toBe('This is not JSON');
  });

  it('should throw error when setting with empty key', async () => {
    await expect(store.set('', {name: 'test'})).rejects.toThrow(
      InvalidArgument,
    );
    await expect(store.set('', {name: 'test'})).rejects.toThrow(
      'cannot set value without a key',
    );
  });

  it('should throw error when setting null or undefined', async () => {
    // @ts-expect-error: Testing invalid input
    await expect(store.set('key', null)).rejects.toThrow(InvalidArgument);
    // @ts-expect-error: Testing invalid input
    await expect(store.set('key', undefined)).rejects.toThrow(InvalidArgument);
    // @ts-expect-error: Testing invalid input
    await expect(store.set('key', null)).rejects.toThrow(
      'cannot set undefined or null',
    );
  });

  it('should use defaultTTL if provided and no specific TTL given', async () => {
    const clientWithOptions = new FakeRedisClient();
    const storeWithDefaultTTL = new RedisStore<DataType>(clientWithOptions, {
      defaultTTL: 100,
    });

    jest.useFakeTimers();
    await storeWithDefaultTTL.set('defaultTTL', {name: 'default'});

    // Verify it's set with the defaultTTL
    expect(await storeWithDefaultTTL.get('defaultTTL')).toEqual({
      name: 'default',
    });

    // Advance time beyond the defaultTTL
    jest.advanceTimersByTime(110);
    jest.runOnlyPendingTimers();

    // Key should be expired
    expect(await storeWithDefaultTTL.get('defaultTTL')).toBeUndefined();
    jest.useRealTimers();
  });

  it('should delete keys and return true if key existed', async () => {
    await store.set('toDelete', {name: 'deleteMe'});
    const result = await store.del('toDelete');
    expect(result).toBe(true);
    expect(await store.get('toDelete')).toBeUndefined();
  });

  it('should return false when deleting non-existent key', async () => {
    const result = await store.del('nonExistent');
    expect(result).toBe(false);
  });

  it('should throw error when deleting with empty key', async () => {
    await expect(store.del('')).rejects.toThrow(InvalidArgument);
    await expect(store.del('')).rejects.toThrow(
      'cannot delete value without a key',
    );
  });

  it('should get correct size', async () => {
    await store.flushAll();
    await store.set('key1', {name: 'one'});
    await store.set('key2', {name: 'two'});
    expect(await store.getSize()).toBe(2);
  });

  it('should return all keys', async () => {
    await store.flushAll();
    await store.set('key1', {name: 'one'});
    await store.set('key2', {name: 'two'});
    const keys = await store.getKeys();
    expect(keys).toHaveLength(2);
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });
});
