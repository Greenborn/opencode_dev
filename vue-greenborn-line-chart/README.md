# vue-greenborn-line-chart

Gráfico de líneas en SVG para Vue 3, sin librerías de gráficos de terceros. Dibuja una o varias
series sobre un eje Y configurable (máximo y sufijo), con grilla, leyenda, tooltips nativos por
punto y hasta 6 marcas distribuidas en el eje X. Pensado para paneles de métricas/estadísticas
simples (porcentajes, conteos, etc).

## Instalación

```bash
npm install vue-greenborn-line-chart
```

```js
import { GbLineChart } from 'vue-greenborn-line-chart'
import 'vue-greenborn-line-chart/style.css'
```

## Uso básico

```vue
<template>
  <GbLineChart :series="series" :labels="labels" :y-max="100" y-sufijo="%" titulo="Mi gráfico" />
</template>

<script setup>
import { GbLineChart } from 'vue-greenborn-line-chart'

const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
const series = [
  { name: 'Serie A', color: '#0d6efd', values: [10, 25, 18, 40, 32] },
  { name: 'Serie B', color: '#dc3545', dashed: true, values: [4, 9, 7, 15, 12] },
]
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `series` | `Array` | `[]` | `[{ name, color?, values: number[], dashed? }]`. `color` default `#0d6efd`, `dashed` dibuja la línea punteada |
| `labels` | `Array` | `[]` | etiquetas del eje X, una por cada posición de `values` |
| `yMax` | `Number` | `100` | valor máximo del eje Y, usado para escalar los puntos y filtrar los ticks `[0,25,50,75,100]` |
| `ySufijo` | `String` | `'%'` | sufijo mostrado junto a cada valor (ticks del eje Y y tooltip de cada punto) |
| `titulo` | `String` | `''` | usado como `aria-label` del SVG (accesibilidad); si está vacío se usa "Gráfico de líneas" |

Si ninguna serie tiene valores (`series` vacío o todas con `values: []`), se muestra un estado
vacío con el texto "Sin registros para graficar en esta página." en vez del SVG.

Los puntos individuales (círculos) solo se dibujan si la serie tiene 80 valores o menos, para no
saturar el gráfico con series largas.

## Emits

Este componente no emite eventos.

## Estilos

Todo el CSS vive en `<style scoped>` dentro del componente (no hay clases globales que puedan
chocar con las del proyecto consumidor). Expone dos variables CSS para integrarse con cualquier
paleta:

```css
:root {
  --gb-line-chart-muted-color: #6c757d;
  --gb-line-chart-border-color: #dee2e6;
}
```

El `import 'vue-greenborn-line-chart/style.css'` sigue siendo necesario por convención (mismo
patrón que el resto de los paquetes Greenborn), aunque hoy ese archivo no agregue reglas propias.

## Demo local

```bash
npm install
npm run dev
```

Abre en `http://localhost:5175`.
