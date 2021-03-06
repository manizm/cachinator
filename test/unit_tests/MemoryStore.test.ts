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
    })
  );

  it('should return a memory store', () => {
    store = cacheStores.getStore(key) as MemoryStore<MDataType, Date>;

    expect(store).toBeInstanceOf(MemoryStore);
  });

  it('should have size, hits, misses and keys length to be 0', () => {
    expect(store.getHits()).toBe(0);
    expect(store.getMisses()).toBe(0);
    expect(store.getSize()).toBe(0);
    expect(store.getKeys()).toHaveLength(0);
  });

  it('should return undefined when tried to get non-inserted item', () => {
    expect(store.get(new Date())).toBeUndefined();
    expect(store.getMisses()).toBe(1);
  });

  it('should properly set and get the data', () => {
    const {key, data} = createBasic();

    const isStored = store.set(key, data);
    const storedData = store.get(key);

    expect(storedData).toEqual(data);
    expect(store.getHits()).toBe(1);
    expect(store.getMisses()).toBeGreaterThan(0); // because of previous test
    expect(store.getSize()).toBe(1);
    expect(store.getKeys()[0]).toEqual(key);
    expect(isStored).toEqual(true);
  });

  it('should throw InvalidArgument when trying to get without a key', () => {
    const key: unknown = undefined;

    expect(() => {
      store.get(key as Date);
    }).toThrowError(InvalidArgument);
  });

  it('should throw InvalidArgument when trying to set without a key', () => {
    const {data} = createBasic();
    const key: unknown = undefined;

    expect(() => {
      store.set(key as Date, data);
    }).toThrowError(InvalidArgument);
  });

  it('should throw InvalidArgument when trying to set without data', () => {
    const data: unknown = undefined;

    expect(() => {
      store.set(new Date(), data as MDataType);
    }).toThrowError(InvalidArgument);
  });

  it('should throw InvalidArgument when tryoing to delete without a key', () => {
    const key: unknown = undefined;

    expect(() => {
      store.del(key as Date);
    }).toThrowError(InvalidArgument);
  });

  it('should delete the key and its data properly', () => {
    const keys = store.getKeys();
    const [key] = keys;

    expect(key).toBeDefined();

    const hits = store.getHits();
    const misses = store.getMisses();
    const size = store.getSize();
    const data = store.get(key);

    expect(data).toBeDefined();

    const isDeleted = store.del(key);
    const afterDeletedData = store.get(key);

    expect(isDeleted).toEqual(true);
    expect(afterDeletedData).toBeUndefined();
    expect(store.getHits()).toBeGreaterThan(hits);
    expect(store.getMisses()).toBeGreaterThan(misses);
    expect(store.getSize()).toBeLessThan(size);
    expect(store.getKeys().length).toBeLessThan(keys.length);
  });

  it('should flush and reset all the stats', () => {
    const {key, data} = createBasic();

    store.set(key, data);

    const isFlushed = store.flushAll();

    expect(isFlushed).toEqual(true);
    expect(store.getHits()).toEqual(0);
    expect(store.getMisses()).toEqual(0);
    expect(store.getSize()).toEqual(0);
    expect(store.getKeys().length).toEqual(0);
    expect(store.get(key)).toBeUndefined();

    // re-reset stats because of previous "get"
    store.flushAll();
  });

  it('should throw MaxSizeReached error when max store size is configured', () => {
    const storeKey = 'MAX_STORE';

    cacheStores.addStore(
      storeKey,
      new MemoryStore({
        defaultTTL: 0,
        maxKeys: 2,
        ttlCheckTimer: 0,
      })
    );

    const store = cacheStores.getStore(storeKey);
    const {key, data} = createBasic();

    store.set(key, data);
    store.set(new Date(), data);

    expect(() => store.set(new Date(), data)).toThrowError(MaxSizeReached);
  });

  describe('with no expiration', () => {
    it('should be implemented', () => {
      // TODO: Add no expiration specific tests
    });
  });
});
