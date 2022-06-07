import {CacheContainer, MemoryStore} from '../src';

export interface MDataType {
  name: string;
}

(() => {
  const cacheContainer = new CacheContainer();
  cacheContainer.addStore(
    'nameStore',
    new MemoryStore({defaultTTL: 0, maxKeys: 0, ttlCheckTimer: 0})
  );

  const thisCache = cacheContainer.getStore('nameStore') as MemoryStore<
    MDataType,
    Date
  >;

  const key = new Date();

  thisCache.set(key, {name: 'ali'});

  console.log(thisCache.get(key));
})();
