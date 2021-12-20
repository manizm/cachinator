import {CacheFactory} from '../src/lib/CacheFactory';
import {MemCache} from '../src/lib/MemCache/MemCache';

export interface MDataType {
  name: string;
}

(() => {
  CacheFactory.addStore(
    'nameStore',
    new MemCache({defaultTTL: 0, maxKeys: 0, ttlCheckTimer: 0})
  );

  const thisCache = CacheFactory.getStore('nameStore') as MemCache<
    MDataType,
    Date
  >;

  const key = new Date();

  thisCache.set(key, {name: 'ali'});

  console.log(thisCache.get(key));
})();
