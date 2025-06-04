import {CacheContainer} from '../../src/lib/CacheContainer';
import {RedisStore, RedisClientLike} from '../../src/lib/strategies/RedisStore/RedisStore';

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

  async keys(_pattern: string): Promise<string[]> {
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
  const container = new CacheContainer();
  const client = new FakeRedisClient();
  const storeKey = 'redis';
  container.addStore(storeKey, new RedisStore<DataType>(client));
  const store = container.getStore(storeKey) as RedisStore<DataType>;

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
    jest.useRealTimers();
  });

  it('should expose the underlying client', () => {
    expect(store.getClient()).toBe(client);
  });
});

