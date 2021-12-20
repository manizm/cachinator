import {DuplicateKey} from '../../src/lib/common/errors/DuplicateKey';
import {CacheFactory} from '../../src/lib/CacheFactory';
import {NotFound} from '../../src/lib/common/errors/NotFound';
import {MemCache} from '../../src/lib/MemCache/MemCache';
import {InvalidArgument} from '../../src/lib/common/errors/InvalidArgument';

export interface MDataType {
  name: string;
}

function createBasicStore(): MemCache<unknown, unknown> {
  return new MemCache({
    defaultTTL: 0,
    maxKeys: 0,
    ttlCheckTimer: 0,
  });
}

function getInvalidKeys(): unknown[] {
  return [new Date(), {}, [], 1, NaN, null, undefined, () => {}, Infinity];
}

// TODO: Implement Test for creating different kinds of stores, when Redis store is added
describe('factory', () => {
  const cacheStores = new CacheFactory();
  let store: MemCache<MDataType, Date>;
  const testKey = 'NO_TTL';

  it('should should throw error when store not found', () => {
    expect(() => {
      cacheStores.getStore('A_STORE_THAT_DOESNT_EXIST');
    }).toThrow(NotFound);
  });

  it('should have no keys', () => {
    expect(cacheStores.getKeys()).toHaveLength(0);
  });

  it('should properly add store', () => {
    cacheStores.addStore(testKey, createBasicStore());
  });

  it('should properly return keys', () => {
    const keys = cacheStores.getKeys();
    expect(keys).toHaveLength(1);
    expect(keys.includes(testKey)).toEqual(true);
  });

  it('should return a store', () => {
    const keys = cacheStores.getKeys();
    const [key] = keys as string[];
    store = cacheStores.getStore(key) as MemCache<MDataType, Date>;

    expect(store).toBeInstanceOf(MemCache);
  });

  it('should be able to add more stores of same types', () => {
    const newKey = 'someNewKey';
    const keysBeforeNewStore = cacheStores.getKeys();
    const storesBeforeNewStore = keysBeforeNewStore.map(k =>
      cacheStores.getStore(k as string)
    );

    cacheStores.addStore(newKey, createBasicStore());

    const newKeys = cacheStores.getKeys();
    const storesAfterAddition = newKeys.map(k =>
      cacheStores.getStore(k as string)
    );

    expect(cacheStores.getStore(newKey)).toBeInstanceOf(MemCache);
    expect(newKeys.includes(newKey)).toEqual(true);
    expect(newKeys.length).toBeGreaterThan(keysBeforeNewStore.length);
    expect(storesBeforeNewStore.length).toBeLessThan(
      storesAfterAddition.length
    );
    expect(storesAfterAddition.length - storesBeforeNewStore.length).toEqual(1);

    storesBeforeNewStore.forEach(s => {
      expect(s).toBeInstanceOf(MemCache);
    });
  });

  it('should throw error when using duplicate keys', () => {
    expect(() => {
      cacheStores.addStore(testKey, createBasicStore());
    }).toThrowError(DuplicateKey);
  });

  it('should throw InvalidArgument when creating store with non-string key', () => {
    const s = createBasicStore();

    getInvalidKeys().forEach(ik => {
      expect(() => {
        cacheStores.addStore(ik as string, s);
      }).toThrowError(InvalidArgument);
    });
  });

  it('should throw InvalidArgument when removing store with non-string key', () => {
    const s = createBasicStore();

    getInvalidKeys().forEach(ik => {
      expect(() => {
        cacheStores.addStore(ik as string, s);
      }).toThrowError(InvalidArgument);
    });
  });

  it('should throw error when getting store with invalid key', () => {
    getInvalidKeys().forEach(ik => {
      expect(() => {
        cacheStores.getStore(ik as string);
      }).toThrowError(InvalidArgument);
    });
  });

  it('should allow removing a store by valid key', () => {
    const keysBeforeRemoval = cacheStores.getKeys();
    const [key] = keysBeforeRemoval;

    const storeIsRemoved = cacheStores.removeStore(key);

    expect(storeIsRemoved).toEqual(true);
    expect(cacheStores.getKeys().length).toBeLessThan(keysBeforeRemoval.length);
    expect(() => {
      cacheStores.getStore(key);
    }).toThrowError(NotFound);
  });
});
