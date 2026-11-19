// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA_PESADO as RR, ANCHO_RUEDA_PESADO as AR } from '../primitivas.js';

export function camion(a) {
    const p = [];
    const L = a.largo / 2, W = a.ancho / 2;
    const y0 = ref.LUZ_SUELO, y1 = y0 + a.cuerpo, y2 = y1 + a.cabina;
    const xa = (a.c0 - 0.5) * a.largo, xb = (a.c1 - 0.5) * a.largo;
    const wc = W * 0.92;

    // chasis, tanque y escape
    p.push(caja(OPACO, -L + 0.3, L - 0.5, y0, y0 + 0.4, -W * 0.55, -W * 0.55 + 0.35, 'negro'));
    p.push(caja(OPACO, -L + 0.3, L - 0.5, y0, y0 + 0.4, W * 0.55 - 0.35, W * 0.55, 'negro'));
    p.push(caja(OPACO, -L + 0.3, L - 0.5, y0 + 0.4, y0 + 0.6, -W + 0.25, W - 0.25, 'plastico'));
    p.push(cil(OPACO, xa - 1.0, y0 + 0.35, W - 0.55, 0.5, 0.5, 2.0, 'x', 'aluminio', 12));
    p.push(cil(OPACO, xa + 0.6, y2 - 0.3, -wc + 0.3, 0.1, 0.1, 2.2, 'y', 'cromo', 8));
    // ruedas: eje delantero simple, dos ejes traseros con rueda doble
    for (const sg of [-1, 1]) {
        p.push(...rueda(0.36 * a.largo, sg * (W - 0.38), RR, AR, 6));
        for (const x of [-0.26 * a.largo, -0.38 * a.largo]) {
            p.push(...rueda(x, sg * (W - 0.38), RR, AR, 6));
            p.push(...rueda(x, sg * (W - 0.38 - AR - 0.04), RR, AR, 6));
        }
        for (const x of [0.36 * a.largo, -0.26 * a.largo, -0.38 * a.largo]) {
            p.push(caja(OPACO, x - RR - 0.15, x + RR + 0.15, y0 + 0.35, y0 + 1.3, sg > 0 ? W - 0.2 : -W - 0.05, sg > 0 ? W + 0.05 : -W + 0.2, 'negro'));
        }
    }

    // plataforma y caja de carga
    p.push(caja(OPACO, -L, xa - 0.2, y1 - 0.2, y1, -W, W, 'negro'));
    p.push(caja(OPACO, -L + 0.05, xa - 0.25, y1, y1 + ref.ALTO_CAJA_CAMION, -W + 0.05, W - 0.05, 'detalle'));
    for (let k = 0; k < 7; k++) {
        const x = -L + 0.4 + k * ((xa - 0.6 + L) / 7);
        for (const sg of [-1, 1]) p.push(caja(OPACO, x - 0.05, x + 0.05, y1, y1 + ref.ALTO_CAJA_CAMION, sg > 0 ? W - 0.02 : -W - 0.02, sg > 0 ? W + 0.02 : -W + 0.02, 'aluminio'));
    }
    p.push(caja(OPACO, -L, -L + 0.06, y1, y1 + ref.ALTO_CAJA_CAMION, -W, W, 'detalle'));
    for (const sg of [-1, 1]) p.push(caja(PILOTO, -L, -L + 0.08, y1 - 0.15, y1 + 0.35, sg * (W - 0.28) - 0.2, sg * (W - 0.28) + 0.2));
    p.push(caja(OPACO, -L, -L + 0.4, y0 + 0.1, y0 + 0.7, -W, W, 'negro'));
    p.push(...patente(-L, y0 + 0.4, 0, false));

    // cabina con vidrios e interior
    for (const sg of [-1, 1]) {
        const z0 = sg > 0 ? wc - 0.14 : -wc, z1 = sg > 0 ? wc : -wc + 0.14;
        const zf = sg > 0 ? wc : -wc - 0.03, zf1 = sg > 0 ? wc + 0.03 : -wc;
        p.push(caja(OPACO, xa, xb, y1, y1 + a.cabina * 0.42, z0, z1));
        p.push(caja(OPACO, xa, xa + 0.15, y1, y2, z0, z1));
        p.push(caja(OPACO, xb - 0.15, xb, y1, y2, z0, z1));
        p.push(caja(OPACO, xa, xb, y2 - 0.12, y2, z0, z1));
        p.push(forma(VIDRIO, xa + 0.15, xb - 0.15, y1 + a.cabina * 0.42, y2 - 0.12, z0, z1, 'cuerpo', () => {}));
        p.push(caja(OPACO, (xa + xb) / 2 - 0.02, (xa + xb) / 2 + 0.02, y1 + 0.1, y1 + a.cabina * 0.4, zf, zf1, 'negro'));
        p.push(caja(OPACO, xb - 0.6, xb - 0.2, y1 + a.cabina * 0.36, y1 + a.cabina * 0.4, zf, zf1, 'cromo'));
        p.push(caja(OPACO, xb - 0.25, xb + 0.05, y1 + 0.5, y1 + 1.6, sg > 0 ? wc : -wc - 0.12, sg > 0 ? wc + 0.12 : -wc, 'negro'));   // espejo
    }
    // frente de la cabina: opaco abajo y arriba, y el parabrisas en medio, a la altura de los ojos
    const vidrio0 = y1 + 0.3, vidrio1 = y2 - 0.12;
    p.push(caja(OPACO, xb, L - 0.1, y1 - 0.2, vidrio0, -wc, wc));
    p.push(caja(OPACO, xb, L - 0.1, vidrio1, y2, -wc, wc));
    p.push(caja(VIDRIO, xb, L - 0.1, vidrio0, vidrio1, -wc + 0.12, wc - 0.12));
    p.push(caja(OPACO, xa, xa + 0.05, y1, y2, -wc, wc, 'plastico'));
    p.push(caja(OPACO, xa - 0.05, L - 0.1, y2, y2 + 0.2, -wc, wc));
    p.push(caja(OPACO, xa, L - 0.1, y2 - 0.02, y2, -wc + 0.1, wc - 0.1, 'techo'));
    p.push(forma(OPACO, xa + 0.4, xb - 0.2, y2 + 0.2, y2 + 0.6, -wc * 0.7, wc * 0.7, 'cuerpo', (v, c) => { if (v.y > c.y) v.x -= 0.5; }));   // deflector
    // trompa y paragolpes
    p.push(caja(OPACO, L - 0.5, L, y0 + 0.05, y0 + 0.65, -W, W, 'negro'));
    p.push(caja(OPACO, L - 0.2, L, y0 + 0.75, y1 + 0.2, -W * 0.6, W * 0.6, 'negro'));
    p.push(caja(OPACO, L - 0.22, L, y0 + 1.0, y0 + 1.06, -W * 0.6, W * 0.6, 'cromo'));
    p.push(...faro(L - 0.1, y0 + 1.0, W - 0.5, 0.12, 0.5, 0.9));
    p.push(...faro(L - 0.1, y0 + 1.0, -W + 0.5, 0.12, 0.5, 0.9));
    p.push(...patente(L - 0.02, y0 + 0.4, 0, true));
    // interior
    const { piso, bx: xs, bz: zC } = ref.cabinaAuto(a);
    const zA = wc * 0.42;
    p.push(caja(OPACO, xa + 0.15, xb, piso, piso + 0.04, -wc + 0.15, wc - 0.15, 'alfombra'));
    p.push(...tablero(xb - 0.2, y1 + a.cabina * 0.3, -wc + 0.15, wc - 0.15, zC, 0.15));
    p.push(...asiento(xs, piso, zC, wc * 0.75));
    p.push(...asiento(xs, piso, zA, wc * 0.75));
    return p;
}

// --- motos -------------------------------------------------------------------------------

