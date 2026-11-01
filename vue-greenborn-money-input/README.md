# vue-greenborn-money-input

Campo de entrada de moneda para Vue 3. Autoformatea el valor con el formato de moneda
argentino (punto para separador de miles, coma para los centavos), bloquea cualquier
carácter que no corresponda a un monto, y emite siempre un valor numérico (`Number`)
compatible con columnas monetarias de base de datos (sin separadores). Es amigable con
dispositivos móviles (`inputmode="decimal"`, tamaño de fuente y padding ajustados en pantallas chicas).

## Instalación

```bash
npm install vue-greenborn-money-input
```

```js
import { GbMoneyInput } from 'vue-greenborn-money-input'
import 'vue-greenborn-money-input/style.css'
```

## Uso básico

```vue
<template>
  <GbMoneyInput v-model="monto" />
</template>

<script setup>
import { ref } from 'vue'
import { GbMoneyInput } from 'vue-greenborn-money-input'

const monto = ref(1234.5) // se muestra como "1.234,50"
</script>
```

`monto` siempre queda como `Number` (por ejemplo `1234.5`), listo para enviar al backend y
guardar en una columna `decimal`/`numeric`.

## Props

| Prop         | Tipo             | Default   | Descripción                                               |
|--------------|------------------|-----------|-------------------------------------------------------------|
| `modelValue` | `Number \| null` | `null`    | Valor numérico (v-model).                                   |
| `id`         | `String`         | `''`      | `id` del `<input>`, para asociar con un `<label>`.           |
| `placeholder`| `String`         | `'0,00'`  | Placeholder.                                                 |
| `disabled`   | `Boolean`        | `false`   | Deshabilita el campo.                                        |
| `prefijo`    | `String`         | `'$'`     | Prefijo visual (vacío para omitirlo).                        |
| `ariaLabel`  | `String`         | `'Monto'` | `aria-label` del `<input>` (ideal pasar un label descriptivo).|
| `maxEnteros` | `Number`         | `0`       | Máximo de dígitos enteros permitidos (0 = sin límite).        |
