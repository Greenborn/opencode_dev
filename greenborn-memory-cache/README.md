# greenborn-memory-cache

Caché en memoria para el lado del servidor en Node.js. TTL por entrada, eventos y limpieza periódica automática. Sin dependencias de runtime (usa `node:events`).

## Instalación

```bash
npm install greenborn-memory-cache
```

## Uso

### ESModules

```js
import MemoryCache from 'greenborn-memory-cache';

const cache = new MemoryCache({ ttlMs: 60_000 });
cache.set('usuario', { id: 1, nombre: 'Lucho' });
const usuario = cache.get('usuario'); // { id: 1, nombre: 'Lucho' }
```

### CommonJS

```js
const MemoryCache = require('greenborn-memory-cache');

const cache = new MemoryCache();
cache.set('clave', 'valor');
console.log(cache.get('clave')); // 'valor'
```

## API

### `new MemoryCache(options?)`

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `ttlMs` | `number` | `0` | TTL por defecto en ms. `0` = no expira. |
| `cleanupIntervalMs` | `number` | `60000` | Intervalo de limpieza periódica en ms. `0` = desactivada. |
| `maxSize` | `number` | `0` | Máximo de entradas. `0` = ilimitado. Al llenarse expulsa la menos usada (LRU). |

### Métodos

| Método | Descripción |
|--------|-------------|
| `set(key, value, ttlMs?)` | Guarda/actualiza una entrada. `ttlMs` anula el por defecto. Devuelve `this`. |
| `get(key)` | Lee una entrada. Devuelve `undefined` si no existe o expiró (purga perezosa). |
| `has(key)` | `true` si la clave existe y no expiró. |
| `delete(key)` | Elimina una entrada. Devuelve `true` si existía. |
| `clear()` | Vacía la caché. Devuelve la cantidad de entradas eliminadas. |
| `cleanup()` | Elimina todas las expiradas manualmente. Devuelve el número eliminado. |
| `keys()` | Array de claves de entradas vivas. |
| `destroy()` | Detiene la limpieza periódica y libera listeners. |

### Propiedades

- `size` — cantidad de entradas vivas (getter).

### Eventos

La instancia es un `EventEmitter`:

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `'set'` | `{ key, value, ttlMs, exists }` | Se registra/actualiza una entrada. |
| `'get'` | `{ key }` | Se lee una entrada existente y viva. |
| `'delete'` | `{ key }` | Se elimina una entrada. |
| `'clear'` | `{ count }` | Se vacía la caché. |
| `'expired'` | `{ key }` | Una entrada expiró (purga perezosa o limpieza periódica). |
| `'evicted'` | `{ key }` | Una entrada fue expulsada por `maxSize` (LRU). |

```js
cache.on('expired', ({ key }) => console.log(`Expirada: ${key}`));
```

## Scripts

```bash
npm run build   # genera dist/ (ESM + CJS + .d.ts)
npm test        # ejecuta la suite con node:test
```

## Licencia

MIT
