import { BLOCK_TYPES } from './mapConfig.js';
import { generateParcelRooms } from './genera_casa/generadorCasa.js';


// Genera el contenido de una parcela individual dentro de una cuadra.
// Recibe las coordenadas de esquina inferior izquierda de la parcela y sus
// dimensiones, junto con referencias a los mapas y estructuras donde debe
// escribir. `orientation` es una letra N/S/E/O que indica el frente.
function generateParcel(plotX0, plotZ0, plotWidth, plotDepth,
                        mapWidth, mapDepth, baseY,
                        surfaceTypeMap, structures,
                        orientation,
                        roomHeight) {
    // fijar todo el suelo de la parcela a pasto primero
    for (let x = plotX0; x < plotX0 + plotWidth; x++) {
        for (let z = plotZ0; z < plotZ0 + plotDepth; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapDepth) {
                surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
            }
        }
    }

    // líneas horizontales (bordes superior e inferior) en ladrillo
    for (let i = 0; i < plotWidth; i++) {
        const x = plotX0 + i;
        const zTop = plotZ0;
        const zBottom = plotZ0 + plotDepth - 1;
        if (x >= 0 && x < mapWidth) {
            if (zTop >= 0 && zTop < mapDepth) {
                if (surfaceTypeMap[x][zTop] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[x][zTop] = BLOCK_TYPES.BRICK;
            }
            if (zBottom >= 0 && zBottom < mapDepth) {
                if (surfaceTypeMap[x][zBottom] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[x][zBottom] = BLOCK_TYPES.BRICK;
            }
        }
    }

    // líneas verticales (bordes izquierdo y derecho) en ladrillo
    for (let j = 0; j < plotDepth; j++) {
        const z = plotZ0 + j;
        const xLeft = plotX0;
        const xRight = plotX0 + plotWidth - 1;
        if (z >= 0 && z < mapDepth) {
            if (xLeft >= 0 && xLeft < mapWidth) {
                if (surfaceTypeMap[xLeft][z] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[xLeft][z] = BLOCK_TYPES.BRICK;
            }
            if (xRight >= 0 && xRight < mapWidth) {
                if (surfaceTypeMap[xRight][z] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[xRight][z] = BLOCK_TYPES.BRICK;
            }
        }
    }

    // generar conjunto de dormitorios según las reglas probabilísticas
    // generate a simple identifier for this parcel so that structures
    // spawned here can be distinguished from those in neighbouring lots.
    const pid = `${plotX0}_${plotZ0}`;
    generateParcelRooms(plotX0, plotZ0, plotWidth, plotDepth,
                        mapWidth, mapDepth, baseY, structures,
                        orientation, pid);
}


export { generateParcel };