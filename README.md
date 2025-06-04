# Cachinator [![tests](https://github.com/manizm/cachinator/actions/workflows/tests.yml/badge.svg)](https://github.com/manizm/cachinator/actions/workflows/tests.yml) [![codecov](https://codecov.io/gh/manizm/cachinator/branch/main/graph/badge.svg?token=56IFRHDUXI)](https://codecov.io/gh/manizm/cachinator) [![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

A cache service factory written in Node.js and TypeScript. It ships with an in-memory cache strategy and a container for managing multiple stores.

## Features

- **CacheContainer** – register and retrieve multiple stores by key
- **MemoryStore** – in-memory cache with TTL support and hit/miss statistics
- **RedisStore** – wrapper around a Redis client with TTL support and direct client access
- Custom errors for invalid arguments, duplicate keys and size limits
- Fully typed API with tests covering core behaviour

## Installation

Use [pnpm](https://pnpm.io/) to install dependencies:

```bash
pnpm install
```

## Running Tests

The test suite compiles the TypeScript sources and runs Jest. Execute:

```bash
pnpm test
```

All tests should pass (58 tests across six suites). The lint step that follows may fail on newer Node versions.

## Example

See `example/MemCacheTest.ts` for a small demonstration. In short:

```ts
import {CacheContainer, MemoryStore} from './src';

const container = new CacheContainer();
container.addStore('names', new MemoryStore({defaultTTL: 0, maxKeys: 0, ttlCheckTimer: 0}));

const store = container.getStore('names') as MemoryStore<{name: string}, Date>;
store.set(new Date(), {name: 'ali'});
console.log(store.get(new Date()));
```

## Todo

- ~~add actual tests~~
- get 100% code coverage
- create detailed readme
- ~~create cache store for redis client~~
