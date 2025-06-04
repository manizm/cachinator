import {InvalidArgument} from '../../src/lib/common/errors/InvalidArgument';
import {CacheContainer} from '../../src/lib/CacheContainer';
import {MemoryStore} from '../../src/lib/strategies/MemoryStore/MemoryStore';
import {MaxSizeReached} from '../../src/lib/common/errors/MaxSizeReached';

export interface MDataType {
  name: string;
}

function createBasic(): {key: Date; data: MDataType} {
  const key = new Date();
  const data: MDataType = {name: 'Khush'};

  return {key, data};
}

describe('store', () => {
  const cacheStores = new CacheContainer();

  const key = 'NO_TTL';
  let store: MemoryStore<MDataType, Date>;

  cacheStores.addStore(
    key,
    new MemoryStore({
      defaultTTL: 0,
      maxKeys: 0,
      ttlCheckTimer: 0,
    }),
  );

  it('should return a memory store', () => {
    store = cacheStores.getStore(key) as MemoryStore<MDataType, Date>;

    expect(store).toBeInstanceOf(MemoryStore);
  });

  it('should have size, hits, misses and keys length to be 0', async () => {
    expect(store.getHits()).toBe(0);
    expect(store.getMisses()).toBe(0);
    expect(await store.getSize()).toBe(0);
    expect(await store.getKeys()).toHaveLength(0);
  });

  it('should return undefined when tried to get non-inserted item', async () => {
    expect(await store.get(new Date())).toBeUndefined();
    expect(store.getMisses()).toBe(1);
  });

  it('should properly set and get the data', async () => {
    const {key, data} = createBasic();

    const isStored = await store.set(key, data);
    const storedData = await store.get(key);

    expect(storedData).toEqual(data);
    expect(store.getHits()).toBe(1);
    expect(store.getMisses()).toBeGreaterThan(0); // because of previous test
    expect(await store.getSize()).toBe(1);
    expect((await store.getKeys())[0]).toEqual(key);
    expect(isStored).toEqual(true);
  });

  it('should throw InvalidArgument when trying to get without a key', async () => {
    const key: unknown = undefined;

    await expect(store.get(key as Date)).rejects.toThrowError(InvalidArgument);
  });

  it('should throw InvalidArgument when trying to set without a key', async () => {
    const {data} = createBasic();
    const key: unknown = undefined;

    await expect(store.set(key as Date, data)).rejects.toThrowError(
      InvalidArgument,
    );
  });

  it('should throw InvalidArgument when trying to set without data', async () => {
    const data: unknown = undefined;

    await expect(store.set(new Date(), data as MDataType)).rejects.toThrowError(
      InvalidArgument,
    );
  });

  it('should throw InvalidArgument when tryoing to delete without a key', async () => {
    const key: unknown = undefined;

    await expect(store.del(key as Date)).rejects.toThrowError(InvalidArgument);
  });

  it('should delete the key and its data properly', async () => {
    const keys = await store.getKeys();
    const [key] = keys;

    expect(key).toBeDefined();

    const hits = store.getHits();
    const misses = store.getMisses();
    const size = await store.getSize();
    const data = await store.get(key);

    expect(data).toBeDefined();

    const isDeleted = await store.del(key);
    const afterDeletedData = await store.get(key);

    expect(isDeleted).toEqual(true);
    expect(afterDeletedData).toBeUndefined();
    expect(store.getHits()).toBeGreaterThan(hits);
    expect(store.getMisses()).toBeGreaterThan(misses);
    expect(await store.getSize()).toBeLessThan(size);
    expect((await store.getKeys()).length).toBeLessThan(keys.length);
  });

  it('should flush and reset all the stats', async () => {
    const {key, data} = createBasic();

    await store.set(key, data);

    const isFlushed = await store.flushAll();

    expect(isFlushed).toEqual(true);
    expect(store.getHits()).toEqual(0);
    expect(store.getMisses()).toEqual(0);
    expect(await store.getSize()).toEqual(0);
    expect((await store.getKeys()).length).toEqual(0);
    expect(await store.get(key)).toBeUndefined();

    // re-reset stats because of previous "get"
    await store.flushAll();
  });

  it('should throw MaxSizeReached error when max store size is configured', async () => {
    const storeKey = 'MAX_STORE';

    cacheStores.addStore(
      storeKey,
      new MemoryStore({
        defaultTTL: 0,
        maxKeys: 2,
        ttlCheckTimer: 0,
      }),
    );

    const store = cacheStores.getStore(storeKey);
    const {key, data} = createBasic();

    await store.set(key, data);
    await store.set(new Date(), data);

    await expect(store.set(new Date(), data)).rejects.toThrowError(
      MaxSizeReached,
    );
  });

  describe('expiration handling', () => {
    it('should expire keys based on ttl', async () => {
      jest.useFakeTimers();

      const storeKey = 'TTL_TEST';
      cacheStores.addStore(
        storeKey,
        new MemoryStore({defaultTTL: 50, maxKeys: 0, ttlCheckTimer: 10}),
      );

      const store = cacheStores.getStore(storeKey) as MemoryStore<
        MDataType,
        Date
      >;
      const {key, data} = createBasic();

      await store.set(key, data, false, 30);

      jest.advanceTimersByTime(20);
      expect(await store.get(key)).toEqual(data);

      jest.advanceTimersByTime(20);
      jest.runOnlyPendingTimers();
      expect(await store.get(key)).toBeUndefined();

      jest.useRealTimers();
    });

    it('should expire keys with custom ttl even when default ttl is 0', async () => {
      jest.useFakeTimers();

      const storeKey = 'CUSTOM_TTL_TEST';
      cacheStores.addStore(
        storeKey,
        new MemoryStore({defaultTTL: 0, maxKeys: 0, ttlCheckTimer: 10}),
      );

      const store = cacheStores.getStore(storeKey) as MemoryStore<
        MDataType,
        Date
      >;
      const {key, data} = createBasic();

      await store.set(key, data, false, 30);

      jest.advanceTimersByTime(20);
      expect(await store.get(key)).toEqual(data);

      jest.advanceTimersByTime(20);
      jest.runOnlyPendingTimers();
      expect(await store.get(key)).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe('with no expiration', () => {
    it('should be implemented', () => {
      // TODO: Add no expiration specific tests
    });
  });
});
