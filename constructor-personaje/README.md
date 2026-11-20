# @greenborn/constructor-personaje

Constructor del personaje voxel: elegir cuerpo, accesorios, nombre y piel, con vista previa 3D.
Se apoya en dos paquetes del mismo scope:

- `@greenborn/modelos-personajes`: cuerpo, peinados, colores, nombres y el muñeco voxel.
- `@greenborn/accesorios-personaje`: gorra, sombrero, lentes y canasta.

Este paquete no duplica el catálogo: lo lee de esos dos y solo agrega la **config del constructor**,
el **panel** y la **vista previa**.

## Instalación

```bash
npm install @greenborn/constructor-personaje@^0.1.0
```

Peers: `@greenborn/modelos-personajes` (>=0.6.0 <1.0.0), `@greenborn/accesorios-personaje` (>=0.2.0 <1.0.0)
y `three` (>=0.170.0). Para la vista 3D, `three` debe resolver a la build **WebGPU** (`three.webgpu.js`),
porque el paquete de personajes usa `NodeMaterial`.

## Subrutas

| Subruta | Contenido | Requiere |
|---|---|---|
| `.` | Config, categorías, aleatorios, normalización. Lógica pura. | modelos y accesorios |
| `./ui` | `crearPanel(contenedor, categorias, eventos)`: panel DOM de chips, nombre y piel. | DOM |
| `./three` | `construirMuneco(cfg, {alto})`, `animarMuneco(root, p)`, `crearVistaPrevia({...})`. | three |
| `./constructor` | `montarConstructorPersonaje({...})`: une todo. Carga `./three` aparte. | DOM |

## Uso típico

```js
import { montarConstructorPersonaje } from '@greenborn/constructor-personaje/constructor';

const ctor = await montarConstructorPersonaje({
    contenedor: document.querySelector('#panel-personaje'),
    configInicial: { nombre: 'Ana' },           // opcional; lo que falte toma el valor por defecto
    alCambiar: cfg => { miEstado.cfg = cfg; },   // recibe una config nueva en cada cambio
    vista: { alto: 0.36, mitadVista: 0.8, centroY: 0.5 },   // opcional: escala de la vista previa
});

ctor.pie.append(miBoton);   // bloque bajo los botones de la izquierda
ctor.cfg;                   // config actual
ctor.redimensionar();       // llamar al cambiar el tamaño de la página
ctor.destruir();
```

Para usar el muñeco en otra escena (por ejemplo, el mapa del juego):

```js
import { construirMuneco, animarMuneco } from '@greenborn/constructor-personaje/three';

const muneco = construirMuneco(cfg, { alto: 0.36 });   // en la unidad de tu escena
scene.add(muneco);
animarMuneco(muneco, { fase, fuerza, corre, dt });      // poses de caminata
```

## Config

```js
{
  piel: '#e0a878', nombre: 'Lucas', rot: 0,            // rot: vista previa 0..3
  pelo, pelocolor, remera, pantalon, calzado,          // índices de @greenborn/modelos-personajes
  cabeza, cabezaColor, lentes, mano, semillaCanasta,   // índices de @greenborn/accesorios-personaje
}
```

- `configDefecto()`: copia de `CONFIG_DEFECTO`.
- `azarPersonaje(rnd?, opciones?)`: cuerpo y accesorios al azar, sin `rot`. Con `generadorSembrado(semilla)` es reproducible.
- `girar(cfg)`: avanza `rot` una vuelta de cuarto.
- `normalizarConfig(cfg)`: lleva a rango válido todo lo que venga de red o de un guardado.

## Estilos

El panel no trae CSS. La página define estas clases: `row`, `col`, `card`, `cat`, `cat-h`, `chips`,
`sw`, `toolbar`, `caption`, `muted`, y `cp-canvas` para el canvas (tamaño de la vista previa).

## Pruebas

```bash
npm test
```

Cubren la lógica pura (config, categorías, aleatorios reproducibles, normalización). La vista 3D
y el panel DOM se prueban en la página que los usa.
