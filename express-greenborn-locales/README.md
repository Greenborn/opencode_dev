# @greenborn/express-greenborn-locales

Locales (dirección y ubicación en mapa) para Express + Knex.

- `GET/POST /mis-locales`, `PUT/DELETE /mis-locales/:id` (requieren `auth`). Editar o borrar sólo es posible para el propietario (403 si no).
- `GET /publicos?ciudad=` y `GET /publico/:id`: sólo locales con `publicado = true`.
- Los locales nuevos arrancan **no publicados**.
- Coordenadas validadas (latitud −90..90, longitud −180..180).
- Genérico: campos extra y término de la entidad se configuran (`camposExtra`, `publicosExtra`, `terminos`).

## Uso

```js
import { createLocalesRouter, createKnexLocalesRepo, createLocalesMigration } from '@greenborn/express-greenborn-locales';

const repo = createKnexLocalesRepo({ db: knex, table: 'locales', propietarioColumn: 'propietario_id' });
app.use('/api', createLocalesRouter({
  repo,
  auth: authMiddleware,
  propietarioColumn: 'propietario_id',
  camposExtra: [{ nombre: 'horario', publicable: true }],
  terminos: { singular: 'tienda', plural: 'tiendas' },
}));
```

Migración: `createLocalesMigration({ table: 'locales', propietarioTable: 'usuarios', camposExtra })`.

## Reglas de privacidad

- `dtoPublicoLocal` no devuelve borradores ni propietario. Las coordenadas salen sólo de locales publicados.
- `filtrarCambiosLocal` acepta sólo campos del esquema y `publicado`.

## Desarrollo

```bash
npm test
```
