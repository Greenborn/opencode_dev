# @greenborn/vue-greenborn-perfil

Perfil editable y vista pública para Vue 3, contra `@greenborn/express-greenborn-perfil`.

- `PerfilEditor`: formulario generado desde el esquema de campos, con interruptor "Mostrar en mi perfil público" por cada campo publicable (apagado por defecto).
- `PerfilPublico`: muestra sólo lo que el backend entregó.
- `usePerfil`: carga, guarda sólo los cambios y expone el estado.
- Términos configurables (`terminos`, por defecto `negocio`).

## Uso

```vue
<script setup>
import axios from 'axios';
import { PerfilEditor } from '@greenborn/vue-greenborn-perfil';
const api = axios.create({ baseURL: '/' });
const campos = [{ nombre: 'nombre', publicable: true }, { nombre: 'telefono', publicable: true }];
</script>
<template>
  <PerfilEditor :api="api" base="/api/perfil" :campos="campos" :terminos="{ singular: 'tienda', plural: 'tiendas' }" />
</template>
```

`api` debe exponer `get`, `put` y devolver `{ data }` (como axios).

## Desarrollo

```bash
npm test
npm run build
```
