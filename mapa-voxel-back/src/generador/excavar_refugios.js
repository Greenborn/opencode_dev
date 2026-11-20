// excavar_refugios.js - Pasa al volumen lo que decidió genera_refugios.js
// (plan_supervivencia.md §13): primero se revoca la sala (ladrillo, piso y
// techo) y después se excava el aire de la sala, la puerta, el descanso, la
// escalera y el hueco de la trampilla. La hoja de la puerta y la tapa NO son
// bloques: son entidades con estado (server/refugios.js) y el hueco queda
// vacío en el volumen.
//
// Se corre AL FINAL de generateVolumeType3, después de pintar el minimapa, así
// el hueco de la trampilla no se marca en él (los refugios son secretos).

import { BLOCK_TYPES } from './mapConfig.js';

function llenar(volume, caja, tipo, ancho, alto, profundo) {
    for (let x = Math.max(0, caja.x0); x < Math.min(ancho, caja.x1); x++) {
        for (let z = Math.max(0, caja.z0); z < Math.min(profundo, caja.z1); z++) {
            for (let y = Math.max(0, caja.y0); y < Math.min(alto, caja.y1); y++) volume.set(x, y, z, tipo);
        }
    }
}

/** Devuelve la cantidad de celdas excavadas. */
export function excavarRefugios(volume, refugios, ancho, profundo, alto) {
    let excavadas = 0;
    for (const r of refugios || []) {
        for (const c of r.acabado || []) llenar(volume, c, BLOCK_TYPES[c.bloque], ancho, alto, profundo);
        for (const c of r.excavar) {
            llenar(volume, c, BLOCK_TYPES.AIR, ancho, alto, profundo);
            excavadas += (c.x1 - c.x0) * (c.y1 - c.y0) * (c.z1 - c.z0);
        }
    }
    return excavadas;
}
