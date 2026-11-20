// index.js - API pública de @greenborn/mapa-voxel-back.
//
// Uso típico (en el worker o en el hilo principal del servidor):
//
//   import { configurarMundo, registrarPlugins, construirMapa, buffersTransferibles }
//     from '@greenborn/mapa-voxel-back';
//
//   configurarMundo({ factorSuperficie: 1, directorioMinimapas: './maps' });
//   registrarPlugins({ arboles: {...}, autos: {...}, /* ...ESQUEMA_PLUGINS */ });
//   const mapa = construirMapa({ modo: 'zombies' });
//
// Los tipos de bloque y las constantes del mundo son parte del paquete;
// los datos de juego entran por plugins.

export { construirMapa, buffersTransferibles } from './generador/construirMapa.js';
export { configurarMundo, getFactorSuperficie, WORLD_CONFIG, TERRAIN_CONFIG, CONFIG_GENERATION,
    BLOCK_TYPES, BLOCK_PROPERTIES, isTintableMinimap, isTintableRender, isTransparent,
    tintBlock, tintBlockMinimap, tintBlockRender } from './generador/mapConfig.js';
export { registrarPlugins, pluginsFaltantes, pluginsRegistrados } from './plugins/registro.js';
export { ESQUEMA_PLUGINS } from './plugins/datos.js';
export { VolumeBuffer, computeColumnHeights } from './generador/volumeBuffer.js';
export { generateMapType3, generateVolumeType3 } from './generador/mapType3.js';
export * as chunkCompacto from './formato/chunk_compacto.js';
