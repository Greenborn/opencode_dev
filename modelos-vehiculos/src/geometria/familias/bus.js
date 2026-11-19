// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA_PESADO as RR, ANCHO_RUEDA_PESADO as AR } from '../primitivas.js';

export function bus(a) {
    const p = [];
    const L = a.largo / 2, W = a.ancho / 2;
    const y0 = ref.LUZ_SUELO, ytop = y0 + a.cuerpo;
    const ya = y0 + a.cuerpo * 0.45, yb = y0 + a.cuerpo * 0.9;

    p.push(caja(OPACO, -L + 0.45, L - 0.45, y0, y0 + 0.3, -W + 0.35, W - 0.35, 'negro'));
    p.push(caja(OPACO, -L + 0.3, L - 0.3, y0 + 0.3, y0 + 0.45, -W + 0.25, W - 0.25, 'plastico'));
    p.push(cil(OPACO, -L + 0.2, y0 + 0.05, W * 0.45, 0.12, 0.12, 0.5, 'x', 'cromo', 8));
    for (const x of [0.32 * a.largo, -0.32 * a.largo]) {
        for (const sg of [-1, 1]) {
            p.push(...rueda(x, sg * (W - 0.38), RR, AR, 6));
            p.push(caja(OPACO, x - RR - 0.15, x + RR + 0.15, y0 + 0.2, y0 + 1.3, sg > 0 ? W - 0.2 : -W - 0.05, sg > 0 ? W + 0.05 : -W + 0.2, 'negro'));
        }
    }
    const piso = y0 + 0.5;
    p.push(caja(OPACO, -L + 0.3, L - 0.3, piso - 0.05, piso, -W + 0.15, W - 0.15, 'alfombra'));

    const n = 8;
    const columnas = [];
    for (let k = 0; k <= n; k++) columnas.push(-L + 0.5 + (k * (a.largo - 1.0)) / n);

    for (const sg of [-1, 1]) {
        const z0 = sg > 0 ? W - 0.14 : -W, z1 = sg > 0 ? W : -W + 0.14;
        const zf = sg > 0 ? W : -W - 0.03, zf1 = sg > 0 ? W + 0.03 : -W;
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y0 + 0.25, ya, z0, z1));
        p.push(caja(OPACO, -L + 0.45, L - 0.45, yb, ytop, z0, z1));
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y0 + a.cuerpo * 0.34, y0 + a.cuerpo * 0.4, zf, zf1, 'detalle'));
        p.push(forma(VIDRIO, -L + 0.5, L - 0.5, ya, yb, z0, z1, 'cuerpo', () => {}));
        for (const x of columnas) p.push(caja(OPACO, x - 0.07, x + 0.07, ya, yb, z0, z1, 'cuerpo'));
        p.push(caja(OPACO, L - 2.2, L - 0.7, y0 + 0.4, ya, zf, zf1, 'negro'));                         // puerta
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y0 + 0.62, y0 + 0.72, zf, zf1, 'cromo'));
        p.push(caja(OPACO, L - 0.9, L - 0.45, ya, yb + 0.45, sg > 0 ? W : -W - 0.14, sg > 0 ? W + 0.14 : -W, 'negro'));   // espejo
    }
    // frente y trasera
    p.push(caja(OPACO, L - 0.5, L, y0 + 0.05, y0 + 0.7, -W, W, 'negro'));
    p.push(caja(OPACO, L - 0.45, L - 0.05, y0 + 0.7, ya, -W, W));
    p.push(caja(OPACO, L - 0.1, L, y0 + 0.78, y0 + 1.2, -W * 0.4, W * 0.4, 'negro'));
    p.push(...faro(L, y0 + 1.0, W - 0.55));
    p.push(...faro(L, y0 + 1.0, -W + 0.55));
    p.push(...patente(L - 0.02, y0 + 0.4, 0, true));
    p.push(forma(VIDRIO, L - 0.45, L - 0.05, ya, yb, -W + 0.2, W - 0.2, 'cuerpo', () => {}));
    p.push(caja(OPACO, L - 0.45, L - 0.05, yb, ytop, -W, W));
    p.push(caja(OPACO, L - 0.3, L - 0.05, yb + 0.15, yb + 0.5, -W * 0.5, W * 0.5, 'negro'));         // letrero
    p.push(caja(FARO, L - 0.3, L - 0.26, yb + 0.2, yb + 0.45, -W * 0.45, W * 0.45));
    p.push(caja(OPACO, -L, -L + 0.5, y0 + 0.05, y0 + 0.7, -W, W, 'negro'));
    p.push(caja(OPACO, -L + 0.05, -L + 0.45, y0 + 0.7, ya, -W, W));
    p.push(forma(VIDRIO, -L + 0.05, -L + 0.45, ya, yb, -W + 0.3, W - 0.3, 'cuerpo', () => {}));
    p.push(caja(OPACO, -L + 0.05, -L + 0.45, yb, ytop, -W, W));
    for (const sg of [-1, 1]) p.push(caja(PILOTO, -L, -L + 0.07, y0 + 0.85, y0 + 1.4, sg * (W - 0.15) - 0.2, sg * (W - 0.15) + 0.2));
    p.push(...patente(-L, y0 + 0.4, 0, false));
    // techo
    p.push(caja(OPACO, -L + 0.45, L - 0.45, ytop, ytop + 0.14, -W + 0.05, W - 0.05, 'cuerpo'));
    p.push(caja(OPACO, -L + 1.0, -L + 2.4, ytop + 0.14, ytop + 0.3, -0.8, 0.8, 'plastico'));
    p.push(caja(OPACO, -L + 0.5, L - 0.5, ytop - 0.06, ytop, -W + 0.2, W - 0.2, 'techo'));
    // interior: filas de asientos, pasillo, barras y puesto del conductor
    for (let f = 0; f < 6; f++) {
        const x = -L + 1.6 + f * 1.55;
        for (const z of [-W * 0.55, -W * 0.22, W * 0.22, W * 0.55]) {
            p.push(...asiento(x, piso, z, W * 0.32, f % 2 ? 'tela' : 'telaClara'));
        }
    }
    p.push(cil(OPACO, 0, ytop - 0.45, 0, 0.04, 0.04, a.largo - 2.0, 'x', 'cromo', 6));
    for (const z of [-W * 0.38, W * 0.38]) p.push(cil(OPACO, 0, ytop - 0.6, z, 0.03, 0.03, a.largo - 2.0, 'x', 'cromo', 6));
    p.push(...tablero(L - 0.5, ya - 0.2, -W + 0.2, W - 0.2, -W * 0.45, 0.15));
    const butaca = ref.cabinaAuto(a);
    p.push(...asiento(butaca.bx, piso, butaca.bz, W * 0.45));
    return p;
}

// --- camión ------------------------------------------------------------------------------

