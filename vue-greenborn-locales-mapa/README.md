# @greenborn/vue-greenborn-locales-mapa

Listado de locales con mapa para Vue 3, contra `@greenborn/express-greenborn-locales`.

- `LocalesMapa`: lista, mapa (envuelve `@greenborn/vue-greenborn-map-viewer`), enlace "Cómo llegar" sólo con coordenadas válidas, y resaltado del punto seleccionado.
- `useLocales`: CRUD de locales propios.
- Helpers: `urlComoLlegar`, `localesAPuntos`, `direccionLegible`.
- Término configurable (`terminos`, por defecto `negocio`).

## Uso

```vue
<script setup>
import axios from 'axios';
import '@greenborn/vue-greenborn-map-viewer/style.css';
import { LocalesMapa, useLocales } from '@greenborn/vue-greenborn-locales-mapa';
const { locales, cargar } = useLocales({ api: axios, base: '/api' });
cargar();
</script>
<template>
  <LocalesMapa :locales="locales" :terminos="{ singular: 'tienda', plural: 'tiendas' }" />
</template>
```

Peers: `vue` y `@greenborn/vue-greenborn-map-viewer`.

## Desarrollo

```bash
npm test
npm run build
```
