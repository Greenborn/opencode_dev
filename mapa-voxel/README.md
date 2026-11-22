# @greenborn/mapa-voxel

Visualización cliente de mapas voxel. Convierte chunks de tipos de bloque en
geometría (typed arrays) con greedy meshing, y la entrega a three.js o a
cualquier otro renderer.

- **Núcleo sin dependencias** (`src/`): corre en el hilo principal o en un Web Worker.
- **Adaptador three.js opcional** (`@greenborn/mapa-voxel/three`): three es *peer dependency*.
- **Modo dinámico** (mapas editables) y **modo estático** (mapas no destructibles).

## Uso básico (dinámico)

```js
import { MapaVoxel, crearPoolMallado } from '@greenborn/mapa-voxel';
import { crearMallaLado, cacheDeMateriales } from '@greenborn/mapa-voxel/three';

const mapa = new MapaVoxel({
    tamanoChunk: 16,        // ancho y profundidad de un chunk, en voxeles
    alto: 48,               // alto del mundo, en voxeles
    bloque: 1,              // tamaño de un voxel en unidades de mundo
    tiposTransparentes: [8],        // ej. vidrio
    paletaTintes: [null, [1, 0.2, 0.2]], // colores lineales RGB; índice 0 sin uso
});

// datos: Uint8Array de tipos, índice (x * alto + y) * profundidad + z
mapa.setChunk(cx, cz, datos, tintes /* Uint16Array opcional */);

// Mallado en workers (recomendado: no bloquea el render)
const pool = crearPoolMallado({
    url: new URL('@greenborn/mapa-voxel/worker', import.meta.url),
    config: { bloque: 1, paletaTintes: mapa.paletaTintes, tiposTransparentes: [8] },
});
await mapa.mallarConPool(pool);

// O en el hilo principal, con presupuesto por frame:
mapa.mallarPendientes({ presupuestoMs: 2 });

// Una malla por región (2x2 chunks) con un grupo por material
const materialDe = cacheDeMateriales((tipo, conTinte, lado) => crearMaterial(tipo, conTinte, lado));
for (const region of regionesVisibles) {
    const comb = mapa.combinarRegion(region);
    if (comb?.opacos) scene.add(crearMallaLado(THREE, comb.opacos, { materialDe, lado: 'opacos' }));
    if (comb?.transparentes) scene.add(crearMallaLado(THREE, comb.transparentes, { materialDe, lado: 'transparentes' }));
}
```

Al editar un voxel con `mapa.setVoxel(x, y, z, tipo, tinte)`, el chunk queda
sucio y, si el voxel está en un borde, también el vecino (sus caras de borde
dependen de ambos lados). El siguiente `mallarPendientes` o `mallarConPool`
lo remalla.

## Modo estático

Para mapas que **no cambian** (escenarios, mapas precargados que se reutilizan
en otros proyectos):

```js
const mapa = new MapaVoxel({ tamanoChunk: 16, alto: 48, modo: 'estatico' });
for (const { cx, cz, datos } of cargaDelMapa) mapa.setChunk(cx, cz, datos);
mapa.congelar();                       // malla todo y libera los datos crudos
const comb = mapa.combinarTodo();      // una geometría por lado, un grupo por material
```

- `setVoxel` lanza error en modo estático (y tras `congelar()`).
- `congelar()` libera `datos`/`tintes` de los chunks: sólo queda la malla. Ahorra
  la memoria del mapa completo.
- `combinarTodo()` reduce al mínimo los draw calls, pero es una sola malla: three.js no puede hacer frustum culling y dibuja todo el mapa en cada frame.
- Para mapas grandes use `crearMallasPorRegion(THREE, mapa, { materialDe })` (`/three`): una malla por región (`regionTamano`² chunks), con culling y material compartido.

## Caras que nunca se ven

Si la cámara nunca baja de cierto plano (por ejemplo, un juego en tercera
persona sobre el suelo), las caras que miran hacia abajo en ese plano o por
debajo nunca se ven de frente: la cara inferior del suelo, el fondo del agua.
`alturaMinimaCamara` (plano Y en voxeles, coordenadas del mapa) las omite y
tampoco evalúa su iluminación:

```js
// suelo en la capa 1: su cara superior es el plano 2, la cámara siempre está por encima
const mapa = new MapaVoxel({ tamanoChunk: 32, alto: 32, alturaMinimaCamara: 2 });
```

Las caras -Y más altas (voladizos, puentes, objetos colgantes) se siguen emitiendo.
Con workers va en `config.alturaMinimaCamara`.

## Atributos que el material no usa

La salida trae `position`, `normal`, `uv`, `color`, `sol` y `luz`. Si el
material no usa textura ni luz horneada, `omitir` evita subirlos a la GPU
(menos memoria por vértice; la geometría es la misma):

```js
crearMallasPorRegion(THREE, mapa, { materialDe, omitir: ['uv', 'luz'] });
```

## Iluminación horneada (hook)

`iluminacion(info)` se llama una vez por cara. `info` es un objeto reutilizable
`{ x, y, z, eje, sentido, tipo }` con las coordenadas de mundo del voxel dueño de
la cara. Debe devolver `{ sol, luz }` en 0..1 (o `null`). Sin hook: `sol = 1`, `luz = 0`.

```js
iluminacion: info => ({ sol: sombraDelSol(info) ? 0.3 : 1, luz: luzDeFarol(info) })
```

Con workers, el hook se pasa como URL de módulo en `config.moduloIluminacion`
(exportando `iluminacion`), porque las funciones no cruzan `postMessage`.

## Cómo funciona

| Pieza | Archivo | Qué hace |
|---|---|---|
| Códigos de cara | `src/codigos.js` | Un entero por cara: tipo, tinte, sol y luz cuantizados, orientación. Dos caras se funden sólo si el código coincide. |
| Mallado | `src/mallador.js` | Copia el chunk con un anillo de vecinos, barre cada eje, arma la máscara y hace greedy merge. |
| Buffers | `src/contorno.js` | Acumulador de vértices/índices y greedy merge 2D. |
| Almacén | `src/mapa.js` | Chunks, marcado de sucios (incluye vecinos del borde), presupuesto de tiempo, versiones, regiones, modo estático. |
| Región | `src/combinar.js` | Une varios chunks en un buffer por lado con un grupo por material. |
| Workers | `src/worker/*` | Pool con caché de chunks crudos por worker (sólo se reenvía lo que cambió) y transferables. |
| three.js | `src/three.js` | Buffers → `BufferGeometry` con grupos, caché de materiales, liberación. |

### Reglas de visibilidad

- El aire nunca tapa una cara.
- Un sólido siempre tapa.
- Un transparente (vidrio) sólo tapa a otro de su mismo tipo: dos vidrios contiguos
  no generan caras entre sí, pero un sólido sí dibuja su cara contra el vidrio.

### Geometría

La malla no tiene T-junctions ni agujeros (cada arista aparece en un número par
de triángulos), con el mínimo de vértices:

- **Contorno mínimo**: cada rectángulo lleva sus 4 esquinas y, en sus aristas,
  sólo los puntos donde cae la esquina de otra cara del chunk (de cualquier
  orientación). Las aristas que están sobre un plano de borde del chunk
  (x o z de borde) llevan todos los enteros: así coinciden con las del vecino
  sin conocer su malla, y cada chunk se sigue mallando por separado (workers,
  edición dinámica).
- **Triangulación sin vértice extra**: abanico desde una esquina cuyas dos
  aristas no tienen puntos, o zigzag entre dos aristas opuestas (n - 2
  triángulos). Sólo si tres o cuatro aristas tienen puntos se usa un vértice
  central (n triángulos).
- **Vértices compartidos**: dentro de un chunk, los vértices con la misma
  posición, eje y código de cara (tipo, tinte, sol, luz, sentido) se reutilizan.

Sol y luz son constantes por cara, así que nada de esto cambia el sombreado: la
superficie por (normal, color, sol) es la misma que con el contorno completo de
la 0.2 (`contornoCompleto: true` la reproduce, para comparar).

Tamaño de chunk: rectángulos más grandes y menos aristas de borde con chunks
más grandes. Para un mapa estático, `tamanoChunk: 32, regionTamano: 1` da las
mismas regiones de culling que `16` con `regionTamano: 2` y menos vértices.

Medido en una ciudad de 600×600×32 (vendedores_capital, 361 regiones): 0.2 →
2.39 M vértices / 1.90 M triángulos; 0.3 → 1.52 M / 1.02 M con la misma
configuración, y 1.30 M / 0.85 M con `alturaMinimaCamara` y chunk 32.

## Pruebas

```bash
npm test
```

Cubren: codificación de caras, conteo y winding de triángulos, malla sin
agujeros sobre voxeles aleatorios y entre chunks (relieve con T-junctions en
los bordes), contorno mínimo con la misma superficie que el completo, vértices
compartidos, `alturaMinimaCamara`, `omitir`, culling entre chunks, tintes, vidrio, hook de
iluminación, combinación de buffers, invalidación de vecinos, modo estático, y
equivalencia entre mallado síncrono y por worker (con el worker simulado en
proceso).

Rendimiento de referencia (Node 24, chunk 16×48×16 con relieve): ~1.1 ms por chunk (0.2: ~0.7 ms, con un 37 % más de vértices). El contorno mínimo y los vértices compartidos cuestan ~0.4 ms por chunk; en el mapa completo se recupera al subir y combinar menos datos.

## Qué NO incluye (todavía)

Esto es el núcleo genérico. Las siguientes piezas del mallado del juego
`Lab/test_3d_html5_multiplayer` son específicas del juego y no se portaron:

- Sombra del sol contra árboles y postes (rayos DDA, `sombras-horneadas`): entra
  por el hook `iluminacion`.
- Luz horneada de postes y habitaciones con alcance y canales: hook.
- Interpolación de luz por vértice (el juego evalúa la luz en cada esquina; aquí
  la luz es por cara).
- Heightmap y raymarch de sombra en tiempo real.
- Tinte de minimapa conmutable en caliente: se consigue reconstruyendo la paleta.
- Debounce de remallado por región (`REGION_DEBOUNCE_MS`).
- Instancias de entidades (árboles, postes): no son voxeles.

## Licencia

MIT
