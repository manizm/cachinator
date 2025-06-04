import {createClient, RedisClientType} from 'redis';
import {CacheContainer, RedisStore} from '../src';

(async () => {
  // Create and connect a node-redis client
  const client: RedisClientType = createClient();
  await client.connect();

  // Adapter implementing the RedisClientLike interface
  const adapter = {
    get(key: string) {
      return client.get(key);
    },
    set(key: string, value: string, ...args: unknown[]) {
      if (args.length === 0) {
        return client.set(key, value);
      }
      // convert args to strings so sendCommand accepts them
      return client.sendCommand([
        'SET',
        key,
        value,
        ...args.map(String),
      ]);
    },
    del(key: string) {
      return client.del(key);
    },
    keys(pattern: string) {
      return client.keys(pattern);
    },
    flushDb() {
      return client.flushDb();
    },
  };

  const container = new CacheContainer();
  container.addStore('redis', new RedisStore(adapter));

  const store = container.getStore('redis') as RedisStore<{name: string}>;

  await store.flushAll();
  await store.set('example', {name: 'ali'}, false, 1000);
  const value = await store.get('example');
  console.log(value);

  await client.quit();
})();
