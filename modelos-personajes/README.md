# @greenborn/modelos-personajes

Modelos visuales de personajes para three.js, en dos estilos y con animaciones listas:

1. **Muñeco articulado** (estilo "humanoide"): esqueleto de 10 huesos, cajas/cilindros/esferas
   fundidos por hueso. Lo usan jugadores, bots, zombies y tenderos del juego.
2. **Personaje voxel** (estilo "cubos"): el muñeco de cubos de los juegos voxel
   (peinado, remera, pantalón, calzado, piel). Incluye un **generador de personajes
   aleatorios** con el mismo catálogo que el constructor de `ideas_juegos_virales`.
3. **Animación**: caminata, correr (inclinación), agacharse (altura), muerte (caída)
   y cadáver tendido que se hunde. Los cálculos son puros (aptos para un Worker) y
   se aplican en three.js.
4. **Optimizaciones de dibujo**: geometría precalculada en un Worker, geometría
   rígida por hueso para instancing, `PoolInstanciado` (un InstancedMesh con
   atributos por instancia) y cadáveres fundidos en una sola geometría.

Agnóstico del juego: los colores y las referencias se inyectan; el paquete no conoce
el catálogo, el mapa ni las reglas. **Si sos un agente de IA, leé primero la sección
"Guía para agentes" más abajo.**

## Instalación

```bash
npm install @greenborn/modelos-personajes@^0.5.0
```

Requisitos: `three` como peer (`>=0.170.0`). El material usa `MeshStandardNodeMaterial`
y `three/tsl`, así que hace falta la build WebGPU (`three.webgpu.js`) como `three`.
Las subrutas `/geometria` y `/animacion` no dibujan nada: sólo calculan.

## Subrutas

| Subruta | Qué trae | Dónde correr |
|---|---|---|
| `@greenborn/modelos-personajes` | todo (raíz) | hilo principal |
| `@greenborn/modelos-personajes/geometria` | geometría del muñeco, rígidas por hueso, serialización, personaje voxel, aleatorios | Worker o hilo principal |
| `@greenborn/modelos-personajes/animacion` | cálculos puros de poses y fases (sin three.js) | Worker o hilo principal |
| `@greenborn/modelos-personajes/three` | esqueleto (`crearMuneco`), poses sobre three, material, `PoolInstanciado`, matrices de instancias y cadáveres | hilo principal |

## Referencia rápida: qué usar para cada cosa

| Quiero... | Usá | Subruta |
|---|---|---|
| Un muñeco con esqueleto para un jugador o bot | `crearMuneco({ colores })` | `/three` |
| Caminar, correr, agacharme, morir sobre ese muñeco | `avanzarFase`, `animarCaminata`, `aplicarInclinacion`, `aplicarAgachado`, `aplicarMuerte` | `/animacion` + `/three` |
| Muchos personajes baratos (zombies, multitud) | `PoolInstanciado` + `geometriasRigidas` + `matrizHuesoInstancia` | `/three` + `/geometria` |
| Cadáveres tirados, una sola draw call | `geometriaCadaverFusionada`, `matrizCadaver`, `poseCadaver` | `/three` + `/animacion` |
| Generar geometría en un Worker | `serializarHumanoide` / `serializarVoxeles` (+ `reconstruir*`) | `/geometria` |
| Precalcular paletas fijas al arrancar | `serializarHumanoide` + `sembrarHumanoide` (receta E) | `/geometria` |
| Personaje voxel de cubos | `voxelesPersonaje(cfg)` | `/geometria` |
| Personaje aleatorio (voxel) | `personajeAleatorio(rnd?)`, `personajeDesdeSemilla(semilla)` | `/geometria` |
| Policía a pie (voxel) | `personajePolicia(rnd?)` o `personajeAleatorioConPolicia(rnd?, opciones?, probPolicia=0.1)` para el pool de peatones | `/geometria` |
| Saber en qué estado está un personaje | `estadoDe({ muerto, agachado, corriendo, velocidad })` | `/animacion` |

## Guía para agentes de IA

### Reglas que no se pueden romper

1. **Unidades**: el muñeco mide `ALTO_MODELO = 5.15` unidades locales (`BASE_MODELO = 1.15`
   bajo y=0, `TOPE_MODELO = 4.0` de coronilla). Para que mida `alto` bloques usá
   `escalaParaAlto(alto)`, y `offsetPies(escala)` para subir la raíz y que los pies queden en el piso.
2. **Pivote en los pies**: la posición de un personaje es la de sus pies. Los cadáveres y
   la raíz de las instancias usan `offsetPies(escalaY)`.
3. **`configurar()` antes de usar el material**: `configurar({ COLOR_LUZ_CALIDA: [r,g,b] })`
   al arrancar. La geometría no lo necesita; el material sí.
4. **Paletas y cachés**: `colores` acepta `piel`, `cuerpo`, `piernas`, `ojos` y colores derivados
   (`chaleco`, `casco`, `bota`...). Lo que no se pasa toma un valor por defecto. La geometría
   se cachea **por paleta completa**: pasar siempre la misma paleta reusa la geometría; una paleta
   nueva la construye (costoso en el hilo principal).
5. **Huesos**: el orden de `HUESOS` (`IDX_HUESO`) es fijo: `raizGroup`, `cabezaGroup`,
   `brazoIzqGroup`, `codoIzqGroup`, `brazoDerGroup`, `codoDerGroup`, `piernaIzqGroup`,
   `rodillaIzqGroup`, `piernaDerGroup`, `rodillaDerGroup`. Las poses y las inversas
   (`INVERSAS_HUESO`) dependen de ese orden.
6. **Worker**: sólo viajan typed arrays. `serializar*` devuelve `{ datos, transferibles }`
   y el hilo principal reconstruye con `reconstruir*`. No pasar objetos `THREE.*` por `postMessage`.
7. **Instancing**: un `PoolInstanciado` por (tipo, hueso). Las instancias usan
   `frustumCulled = false` (se mueven por todo el mapa). Escribir la matriz con `poner` y
   llamar `subir()` **una vez por frame**.
8. **Versiones**: `crearMuneco` devuelve `{ group, partes }`. `group` es el que se
   inclina/achata (rotación y escala). Si necesitás además bajar el muñeco al morir, ponelo
   dentro de un `THREE.Group` raíz (`root`) y pasá ese `root` a `aplicarMuerte`.

### Recetas

#### A. Muñeco con esqueleto con todas las animaciones (jugador o bot cercano)

```js
import * as THREE from 'three';
import { configurar } from '@greenborn/modelos-personajes/geometria';
import {
  crearMuneco, animarCaminata, aplicarInclinacion, aplicarAgachado, aplicarMuerte,
} from '@greenborn/modelos-personajes/three';
import {
  avanzarFase, estadoDe, ANIMACION,
} from '@greenborn/modelos-personajes/animacion';
import { escalaParaAlto } from '@greenborn/modelos-personajes/geometria';

configurar({ COLOR_LUZ_CALIDA: [1.0, 0.86, 0.62] });   // una vez, al arrancar

const ALTO_IMPACTO = 4.35;      // ejemplo: alto 4 + margen de cabeza 0.35 (del juego)
const ALTO_AGACHADO = 2.35;     // ejemplo: alto agachado 2 + margen 0.35 (del juego)

const { group: modelo, partes } = crearMuneco({ colores: { cuerpo: 0x2e4a1a, piel: 0xe0a878 } });
const root = new THREE.Group();   // posición = pies; el muñeco cuelga de acá
root.add(modelo);
scene.add(root);

const st = { fase: 0, muerto: false, t: 0, yOriginal: 0, corriendo: false };

// Cada frame. `velocidad` en bloques/s, `agachado` y `corriendo` booleanos.
function actualizar(dt, velocidad, agachado, corriendo) {
  if (st.muerto) {
    st.t += dt;
    aplicarMuerte(modelo, root, st.yOriginal, st.t, ALTO_IMPACTO);   // gira y cae en 0.5 s
    return;
  }
  const { fase, fuerza } = avanzarFase(st.fase, velocidad, dt);      // avanza la fase del ciclo
  st.fase = fase;
  animarCaminata(partes, fase, fuerza, true);                        // brazos y piernas
  aplicarInclinacion(modelo, corriendo, dt);                         // se inclina al correr
  aplicarAgachado(modelo, escalaParaAlto(agachado ? ALTO_AGACHADO : ALTO_IMPACTO), dt);
}

// Para elegir el nombre del estado (útil para depurar o para sonido):
estadoDe({ muerto: st.muerto, agachado, corriendo, velocidad });     // 'muerto'|'agachado'|'correr'|'caminar'|'quieto'
```

Valores del juego, para replicar el mismo comportamiento: `ANIMACION.VEL_CAMINATA = 8`
(bloques/s, con la que la caminata va a pleno), muerte en `MUERTE_DURACION_S = 0.5` (giro
`MUERTE_GIRO = 0.35π`, caída `MUERTE_CAIDA = 0.4` × alto), y el muñeco muerto se oculta a los
`MUERTE_RETIRO_S = 10` s (`muertoOculto(t)`).

#### B. Zombies o multitud en PoolInstanciado (10 draw calls por tipo, sin importar cuántos)

```js
import * as THREE from 'three';
import { geometriasRigidas, poseCaminataRigida, INVERSAS_HUESO, escalaParaAlto } from '@greenborn/modelos-personajes/geometria';
import { PoolInstanciado, matrizRaizInstancia, matrizGrupoInstancia, matrizHuesoInstancia, materialUnido } from '@greenborn/modelos-personajes/three';

const ESCALA_BASE = escalaParaAlto(ALTO_IMPACTO);
const geometrias = geometriasRigidas(colores);          // 10 BufferGeometry, en orden de HUESOS
const material = materialUnido({});
const pools = geometrias.map((g, i) => new PoolInstanciado(scene, g, material, {
  nombre: `zombie_${i}`, atributos: [{ nombre: 'luzInst', tamano: 3 }],   // atributo opcional, p. ej. luz
}));
const pose = geometrias.map(() => new THREE.Matrix4());
const _raiz = new THREE.Matrix4(), _grupo = new THREE.Matrix4(), _base = new THREE.Matrix4(), _m = new THREE.Matrix4();

// Escribe la pose de un zombie para este frame (llamar por cada visible).
function escribirZombie(id, x, y, z, rotY, fase, fuerza, sx = 1, sy = 1, sz = 1) {
  matrizRaizInstancia(_raiz, x, y, z, rotY, ESCALA_BASE * sy);
  matrizGrupoInstancia(_grupo, ESCALA_BASE, sx, sy, sz);
  _base.multiplyMatrices(_raiz, _grupo);
  poseCaminataRigida(fase, fuerza, pose, true);
  pools.forEach((p, i) => {
    p.reservar(id);
    p.poner(id, matrizHuesoInstancia(_m, _base, pose[i], INVERSAS_HUESO[i]));
  });
}
// Cada frame, después de escribir todos: pools.forEach(p => p.subir());
// Al salir de escena o morir:           pools.forEach(p => p.liberar(id));
```

En las instancias la cabeza y la raíz quedan en reposo (no siguen la mira). Si un
personaje necesita mirar a algo, usá el muñeco con esqueleto (receta A).

#### C. Cadáveres en una sola draw call

```js
import * as THREE from 'three';
import { geometriaCadaverFusionada, matrizCadaver, PoolInstanciado, materialUnido } from '@greenborn/modelos-personajes/three';
import { VIDA_CADAVER_S } from '@greenborn/modelos-personajes/animacion';
import { escalaParaAlto } from '@greenborn/modelos-personajes/geometria';

const ESCALA_BASE = escalaParaAlto(ALTO_IMPACTO);
const pool = new PoolInstanciado(scene, geometriaCadaverFusionada(colores), materialUnido({}), { nombre: 'cadaveres' });
const _m = new THREE.Matrix4();
let seq = 0;
const cuerpos = new Map();

// Al morir un zombie: x,y,z de los pies; rotY; escala por tipo (sx, sy, sz).
function morir(x, y, z, rotY, sx = 1, sy = 1, sz = 1) {
  const id = ++seq;
  pool.reservar(id);
  cuerpos.set(id, { x, y, z, rotY, sx, sy, sz, t: 0 });
}
// Cada frame:
function actualizar(dt) {
  for (const [id, c] of cuerpos) {
    c.t += dt;
    if (c.t >= VIDA_CADAVER_S) { pool.liberar(id); cuerpos.delete(id); continue; }
    pool.poner(id, matrizCadaver(_m, c, c.t, ESCALA_BASE, ALTO_IMPACTO));
  }
  pool.subir();
}
```

Limitación: `geometriaCadaverFusionada` usa la paleta que le pases; un tipo especial se ve con su
escala, pero con la paleta de esa geometría.

#### D. Personaje voxel aleatorio, serializado para un Worker

```js
// worker_personaje.js (módulo)
import { personajeDesdeSemilla, voxelesPersonaje, serializarVoxeles } from '@greenborn/modelos-personajes/geometria';
self.onmessage = ({ data }) => {
  const cfg = data.semilla != null ? personajeDesdeSemilla(data.semilla, { piel: 'naturales' }) : data.cfg;
  const { datos, transferibles } = serializarVoxeles(voxelesPersonaje(cfg));
  self.postMessage({ cfg, datos }, transferibles);
};

// hilo principal
import { reconstruirVoxeles } from '@greenborn/modelos-personajes/geometria';
const vox = reconstruirVoxeles(datos);   // [{ x, y, z, c }] con c en #rrggbb
```

Para que un personaje aleatorio sea reproducible, guardá su `semilla` o su `cfg` (objeto plano):
`{ nombre, piel, pelo (0..4), pelocolor, remera, pantalon, calzado }`. Los índices apuntan a
`CATALOGO_PERSONAJE`; `pelo` es `corto`, `rulos`, `trenza`, `rapado` o `gorra`.

#### E. Precalcular paletas fijas en un Worker al arrancar

```js
// worker_precalculo.js
import { serializarHumanoide } from '@greenborn/modelos-personajes/geometria';
self.onmessage = ({ data }) => {
  const modelos = data.paletas.map(c => serializarHumanoide(c));
  self.postMessage({ modelos: modelos.map(m => m.datos) }, modelos.flatMap(m => m.transferibles));
};

// hilo principal
import { reconstruirHumanoide, sembrarHumanoide } from '@greenborn/modelos-personajes/geometria';
w.onmessage = e => e.data.modelos.forEach((datos, i) => sembrarHumanoide(paletas[i], reconstruirHumanoide(datos)));
```

Lo que no llegó a tiempo se construye en el hilo principal con el mismo resultado, más lento.

### Mapa de la API

**`@greenborn/modelos-personajes/geometria`**
- `configurar(valores)`, `ref`
- Muñeco: `construirMuneco`, `geometriasRigidas`, `poseCaminataRigida`, `calcularHumanoide`, `sembrarHumanoide`, `claveHumanoide`, `HUESOS`, `IDX_HUESO`, `PADRE_HUESO`, `INVERSAS_HUESO`, `REPOSO`, `BASE_MODELO`, `TOPE_MODELO`, `ALTO_MODELO`, `escalaParaAlto(alto)`, `offsetPies(escala)`
- Serialización: `serializarGeometria`, `reconstruirGeometria`, `serializarHumanoide(colores)`, `reconstruirHumanoide({skin, rigidas})`, `serializarVoxeles(vox)`, `reconstruirVoxeles({pos, col})`
- Voxel: `voxelesPersonaje(cfg)`, `PIEL_DEFECTO`, `PEINADOS`, `COLORES_PELO`, `COLORES_REMERA`, `COLORES_PANTALON`, `COLORES_CALZADO`, `COLOR_GORRA`
- Aleatorios: `personajeAleatorio(rnd?, {piel})`, `personajeDesdeSemilla(semilla, {piel})`, `generadorSembrado(semilla)`, `normalizarPersonaje(cfg)`, `CATALOGO_PERSONAJE`, `NOMBRES`, `PIELES_NATURALES`
- Color: `tint`, `mezclar`, `luz`
- `ConstructorPiezas`

**`@greenborn/modelos-personajes/animacion`** (sin three.js)
- `ANIMACION` (constantes del juego), `VIDA_CADAVER_S`
- `avanzarFase(fase, velocidad, dt, cfg?) → {fase, fuerza}`
- `estadoDe({muerto, agachado, corriendo, velocidad}) → 'muerto'|'agachado'|'correr'|'caminar'|'quieto'`
- `inclinacionObjetivo(corriendo, cfg?)`, `suavizar(actual, objetivo, dt, tasa)`
- `poseMuerte(t, altoImpacto, cfg?) → {giro, caida}`, `muertoOculto(t, cfg?)`
- `poseCadaver(t, cfg?) → {angulo, hundimiento, terminado}`

**`@greenborn/modelos-personajes/three`**
- Voxel: `crearPersonajeVoxel(cfg, {material}) → {group, partes}`, `animarCaminataVoxel(partes, fase, fuerza)`, `piezasVoxelRigidas(cfg)`, `cuboVoxel(voxel, marco, pivote) → BufferGeometry` (un cubo con color y acabado por vértice, en el espacio del pivote)
- Muñeco: `crearMuneco({colores, sombras, proyecta, emisivo}) → {group, partes}`, `animarCaminata(partes, fase, fuerza, conBrazos)`, `apuntarBrazo(partes, 'Izq'|'Der', objetivo)`, `materialUnido(opciones)`
- Animación: `aplicarMuerte(modelo, raiz, yOriginal, t, altoImpacto)`, `aplicarInclinacion(modelo, corriendo, dt)`, `aplicarAgachado(modelo, escalaYObjetivo, dt)`
- Instancing: `PoolInstanciado(scene, geometria, material, {nombre, capacidadInicial, atributos})` con `reservar`, `poner`, `escribirAtributo(id, nombre, valores)`, `liberar`, `subir`, `slotDeId`, `vivos`, `destruir`
- Matrices: `matrizHuesoInstancia(out, base, pose, inversa)`, `matrizRaizInstancia(out, x, y, z, rotY, escalaY)`, `matrizGrupoInstancia(out, escalaBase, sx, sy, sz)`, `matrizCadaver(out, c, t, escalaBase, altoImpacto)`, `geometriaCadaverFusionada(colores)`

### Qué NO hace el paquete (lo pone el juego)

- Decidir qué personaje usar, su catálogo de tipos, su paleta por tipo de zombie ni sus reglas.
- La luz horneada por instancia: el pool tiene **atributos por instancia** genéricos (`escribirAtributo`);
  el juego registra su atributo (por ejemplo `luzInst`, 3 floats) y lo escribe con su propia codificación.
- La colisión, la cámara, el arma ni el HUD.
- Que la cabeza siga la mira en las instancias (quedan en reposo).

### Uso actual en el juego (referencia para comparar)

Proyecto `Lab/test_3d_html5_multiplayer`. Hoy usa el paquete en la versión 0.1.0, con su
propia animación e instancing dentro del cliente:

- `cliente/multijugador/jugador_remoto.js`: caminata, inclinación al correr, agachado y muerte.
- `cliente/multijugador/zombies_instanciados.js` y `pool_zombies.js`: pools por hueso.
- `cliente/multijugador/cadaveres_zombies.js`: cadáver fundido y ciclo de caída y hundimiento.
- `cliente/modelo_humanoide.js`: precálculo en Worker de las paletas fijas.

Migrar el juego a las funciones de la 0.3.0 es un cambio aparte.

## Versiones

- **0.6.0**: exporta `cuboVoxel` (subruta `/three` y raíz). Cambio aditivo: la API anterior no cambia.
- **0.5.0**: policía a pie. `cfg.policia = true` cambia la camisa y el pantalón por el uniforme fijo
  (`COLOR_UNIFORME_POLICIA`, `COLOR_PANTALON_POLICIA`), agrega la placa dorada en el pecho y usa la gorra
  (`pelo: 4`). Nuevas funciones: `personajePolicia` y `personajeAleatorioConPolicia` (pool de peatones con una
  fracción de policías). `personajeAleatorio` no cambió: mismo sorteo y mismos personajes para una semilla dada.
  La clave de caché del personaje voxel incluye `policia`.
- **0.4.0**: personaje voxel con el mismo esquema que el muñeco articulado: `crearPersonajeVoxel`
  (partes con pivote, `{ group, partes }`), `animarCaminataVoxel`, `piezasVoxelRigidas` (geometría por
  parte, cacheada por cfg) y `matrizParteVoxel` / `matricesVoxelInstancia` para `PoolInstanciado`.
  Escala con `escalaVoxelParaAlto(alto)`.
- **0.3.0**: subruta `/animacion` (poses puras), personaje voxel, personajes aleatorios,
  `PoolInstanciado` con atributos, matrices de instancias y cadáveres, geometría de cadáver
  fundida, y aplicación de muerte, agachado e inclinación sobre three.
- **0.2.0**: personaje voxel y personajes aleatorios (primera versión).
- **0.1.0**: muñeco articulado, geometría por hueso, serialización y material.

## Pruebas

```bash
npm test     # node --test: poses, pool, matrices y personaje voxel
```

## Licencia

MIT.
