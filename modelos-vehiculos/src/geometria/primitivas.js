// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from './contexto.js';

export const OPACO = 0, VIDRIO = 1, FARO = 3, PILOTO = 4, AZUL = 6;

// Unidades nativas de cada familia. Los detalles de cada familia (parrillas, faros, asientos, volante...) son medidas
// fijas, así que cada familia se construye con su rueda y sus cotas en UN mismo sistema de unidades y se lleva a
// metros con `def.scale` (escala uniforme, ver construir.js). Antes las ruedas de cada familia estaban en unidades
// distintas (bus/camión 1.0 m de radio, moto 0.8, furgón 0.33, auto 0.33 con cotas de ~1.2) y no encajaban.
export const RADIO_RUEDA = 0.33;      // furgón (metros reales)
export const ANCHO_RUEDA = 0.22;
export const RADIO_RUEDA_AUTO = 0.47; // turismo: nativo, def.scale ~0.7 -> radio real 0.33
export const ANCHO_RUEDA_AUTO = 0.3;
export const RADIO_RUEDA_PESADO = 0.5; // bus y camión (metros reales: diámetro 1 m)
export const ANCHO_RUEDA_PESADO = 0.3;

/** Colores fijos; 'cuerpo' y 'detalle' salen de cada vehículo. */
export const COLOR = {
    negro: 0x16171a, plastico: 0x25272c, goma: 0x0f1011, cromo: 0xc3c8d0,
    aluminio: 0x8f959e, tela: 0x2d2f36, telaClara: 0x81725d, techo: 0x8b8578,
    tablero: 0x1c1e22, volante: 0x0b0b0d, placa: 0xe9e9e2, tinta: 0x0b0c0e,
    ambar: 0xff9d1f, alfombra: 0x1b1c20
};

// --- piezas ------------------------------------------------------------------

let paleta = null;   // colores del vehículo en construcción (ver fijarPaleta)

export function hex(nombre) {
    if (nombre === 'cuerpo') return paleta.cuerpo;
    if (nombre === 'detalle') return paleta.detalle;
    return COLOR[nombre];
}

export function pintar(g, nombre) {
    const c = new THREE.Color(hex(nombre));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
}

export function pieza(slot, g, col) {
    if (slot === OPACO) pintar(g, col);
    return { slot, g };
}

/** Caja entre (x0,y0,z0) y (x1,y1,z1). */
export function caja(slot, x0, x1, y0, y1, z0, z1, col = 'cuerpo') {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return pieza(slot, g, col);
}

/** Caja a la que se le mueven vértices con `fn(v, centro)` (cuñas, inclinaciones). */
export function forma(slot, x0, x1, y0, y1, z0, z1, col, fn) {
    const p = caja(slot, x0, x1, y0, y1, z0, z1, col);
    const pos = p.g.attributes.position;
    const v = new THREE.Vector3();
    const c = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 };
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        fn(v, c);
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    p.g.computeVertexNormals();
    return p;
}

/** Cilindro/cono centrado en (x,y,z), con el eje sobre 'x' | 'y' | 'z'. */
export function cil(slot, x, y, z, rArriba, rAbajo, largo, eje, col = 'cromo', seg = 10) {
    const g = new THREE.CylinderGeometry(rArriba, rAbajo, largo, seg);
    if (eje === 'x') g.rotateZ(Math.PI / 2);
    else if (eje === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    return pieza(slot, g, col);
}

export function toro(x, y, z, R, r, eje, col, inclinar = 0) {
    const g = new THREE.TorusGeometry(R, r, 6, 14);
    if (eje === 'x') g.rotateY(Math.PI / 2);
    if (inclinar) g.rotateZ(inclinar);
    g.translate(x, y, z);
    return pieza(OPACO, g, col);
}

/** Rueda completa: cubierta, llanta con rayos, tapa central y disco de freno. */
export function rueda(x, z, radio = RADIO_RUEDA, ancho = ANCHO_RUEDA, rayos = 5) {
    const p = [];
    p.push(cil(OPACO, x, radio, z, radio, radio, ancho, 'z', 'goma', 16));
    p.push(cil(OPACO, x, radio, z, radio * 0.66, radio * 0.66, ancho + 0.04, 'z', 'aluminio', 14));
    p.push(cil(OPACO, x, radio, z, radio * 0.52, radio * 0.52, ancho - 0.12, 'z', 'plastico', 12));
    p.push(cil(OPACO, x, radio, z, radio * 0.2, radio * 0.2, ancho + 0.08, 'z', 'cromo', 8));
    for (let k = 0; k < rayos; k++) {
        const g = new THREE.BoxGeometry(radio * 0.5, radio * 0.12, ancho + 0.07);
        g.translate(radio * 0.47, 0, 0);
        g.rotateZ((k * 2 * Math.PI) / rayos);
        g.translate(x, radio, z);
        p.push(pieza(OPACO, g, 'aluminio'));
    }
    return p;
}

/** Faro: carcasa cromada con lente. */
export function faro(x, y, z, sx = 0.12, sy = 0.4, sz = 0.8) {
    return [
        caja(OPACO, x - sx, x, y - sy / 2 - 0.05, y + sy / 2 + 0.05, z - sz / 2 - 0.05, z + sz / 2 + 0.05, 'cromo'),
        caja(FARO, x - 0.01, x + 0.05, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2)
    ];
}

export function patente(x, y, z, frente) {
    const d = frente ? 1 : -1;
    const piezas = [caja(OPACO, Math.min(x - 0.02 * d, x + 0.03 * d), Math.max(x - 0.02 * d, x + 0.03 * d), y - 0.17, y + 0.17, z - 0.45, z + 0.45, 'placa')];
    for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        const a = x + 0.03 * d, b = x + 0.05 * d;
        piezas.push(caja(OPACO, Math.min(a, b), Math.max(a, b), y - 0.09, y + 0.09, z + i * 0.11 - 0.03, z + i * 0.11 + 0.03, 'negro'));
    }
    return piezas;
}

/** Asiento: base, respaldo inclinado y apoyacabezas. */
export function asiento(x, yPiso, z, ancho, col = 'tela', altoMax = 1.85) {
    const k = Math.min(1, altoMax / 1.85);   // en cabinas bajas el respaldo se acorta
    return [
        caja(OPACO, x - 0.45, x + 0.4, yPiso + 0.25, yPiso + 0.55, z - ancho / 2, z + ancho / 2, col),
        forma(OPACO, x - 0.55, x - 0.2, yPiso + 0.55, yPiso + 0.55 + 0.9 * k, z - ancho / 2, z + ancho / 2, col,
            (v, c) => { if (v.y > c.y) v.x -= 0.28 * k; }),
        caja(OPACO, x - 0.62, x - 0.4, yPiso + 0.55 + 0.9 * k, yPiso + 0.55 + 1.3 * k, z - ancho * 0.25, z + ancho * 0.25, col),
        caja(OPACO, x - 0.2, x + 0.4, yPiso + 0.1, yPiso + 0.25, z - ancho * 0.3, z + ancho * 0.3, 'plastico')
    ];
}

/** Tablero, pantalla, columna y volante. `xFrente` = pared del motor. */
export function tablero(xFrente, yBase, zIzq, zDer, zVolante, inclinacion = 0.45) {
    const p = [];
    const prof = 1.05;
    const zc = (zIzq + zDer) / 2;
    p.push(caja(OPACO, xFrente - prof, xFrente, yBase - 0.5, yBase + 0.12, zIzq, zDer, 'tablero'));
    p.push(caja(OPACO, xFrente - prof, xFrente - 0.2, yBase + 0.12, yBase + 0.32, zIzq, zDer, 'plastico'));
    p.push(caja(OPACO, xFrente - 0.95, xFrente - 0.62, yBase + 0.34, yBase + 0.52, zVolante - 0.6, zVolante + 0.6, 'negro'));
    p.push(caja(AZUL, xFrente - 0.97, xFrente - 0.93, yBase + 0.36, yBase + 0.5, zVolante - 0.35, zVolante + 0.35));
    p.push(caja(AZUL, xFrente - 1.0, xFrente - 0.96, yBase + 0.02, yBase + 0.24, zc - 0.15, zc + 0.15));
    p.push(cil(OPACO, xFrente - 1.28, yBase + 0.08, zVolante, 0.06, 0.06, 0.55, 'x', 'negro', 6));
    p.push(toro(xFrente - 1.55, yBase + 0.2, zVolante, 0.38, 0.055, 'x', 'volante', -inclinacion));
    p.push(caja(OPACO, xFrente - 1.6, xFrente - 1.5, yBase + 0.14, yBase + 0.26, zVolante - 0.09, zVolante + 0.09, 'plastico'));
    return p;
}

// --- vehículos de turismo (sedán, hatch, cupé, SUV, taxi, patrulla, pickup) ----


export function fijarPaleta(p) { paleta = p; }
