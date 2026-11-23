# @greenborn/express-greenborn-perfil

Perfil de usuario editable y perfil público para Express + Knex.

- `GET /mi-perfil` y `PUT /mi-perfil` (requieren `auth`): el usuario edita sólo sus campos editables e interruptores.
- `GET /publico/:id`: salida pública mediante **lista blanca**. Un campo sale sólo si es `publicable` y su interruptor está encendido (apagado por defecto).
- Genérico: el término de la entidad es configurable (`terminos`, por defecto `negocio`/`negocios`). No contiene campos de dominio.
- No depende de ninguna autenticación concreta: recibe el middleware `auth` por inyección (funciona con `@greenborn/express-greenborn-sso-back`).

## Uso

```js
import express from 'express';
import { createPerfilRouter, createKnexPerfilRepo, createPerfilMigration } from '@greenborn/express-greenborn-perfil';

const campos = [
  { nombre: 'nombre', publicable: true },
  { nombre: 'telefono', publicable: true },          // interruptor: mostrar_telefono
  { nombre: 'nota', tipo: 'texto_largo', editable: true },
  { nombre: 'interno', editable: false },           // nunca sale ni se edita desde el cliente
];

const repo = createKnexPerfilRepo({ db: knex, table: 'perfiles', userColumn: 'usuario_id', campos });
app.use('/api/perfil', createPerfilRouter({ repo, auth: authMiddleware, campos, terminos: { singular: 'tienda', plural: 'tiendas' } }));
```

Migración (el archivo y su timestamp los define el proyecto):

```js
import { createPerfilMigration } from '@greenborn/express-greenborn-perfil';
export const { up, down } = createPerfilMigration({ table: 'perfiles', userTable: 'usuarios', campos });
```

## Reglas de privacidad

- `dtoPublico(fila, campos)` es la única salida pública. Lo que no esté en la lista no se devuelve.
- `filtrarCambios(body, campos)` descarta claves no editables, `id`, claves de dueño y cualquier otra.
- Un interruptor de privacidad nuevo siempre arranca en `false`.

## Desarrollo

```bash
npm test
```
