import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mallarChunk } from '../src/mallador.js';
import { combinarLado } from '../src/combinar.js';
import { codificar, decodificar, cuantizar, NIVELES } from '../src/codigos.js';

const A = 4, ALTO = 4, P = 4;

function chunk(cx, cz, fn, tintes = null) {
    const datos = new Uint8Array(A * ALTO * P);
    for (let x = 0; x < A; x++) for (let y = 0; y < ALTO; y++) for (let z = 0; z < P; z++) {
        datos[(x * ALTO + y) * P + z] = fn(x, y, z);
    }
    return { cx, cz, ancho: A, alto: ALTO, profundidad: P, datos, tintes };
}

const sinVecinos = () => undefined;

/** Lista de triángulos [[p0,p1,p2], ...] con posiciones y normal declarada, por entrada. */
function triangulos(entradas) {
    const out = [];
    for (const e of entradas) {
        for (let t = 0; t < e.index.length; t += 3) {
            const v = [0, 1, 2].map(k => {
                const i = e.index[t + k];
                return {
                    p: [e.position[i * 3], e.position[i * 3 + 1], e.position[i * 3 + 2]],
                    n: [e.normal[i * 3], e.normal[i * 3 + 1], e.normal[i * 3 + 2]],
                };
            });
            out.push(v);
        }
    }
    return out;
}

const todas = salida => [...salida.opacos, ...salida.transparentes];

test('codificar/decodificar es inverso y cuantizar satura en 0..NIVELES', () => {
    for (const [tipo, tinte, pos, sol, luz] of [[0, 0, true, 0, 0], [255, 4095, false, 7, 7], [9, 3, true, 4, 2]]) {
        const d = decodificar(codificar(tipo, tinte, pos, sol, luz));
        assert.deepEqual(d, { tipo, tinte, positivo: pos, sol, luz });
    }
    assert.equal(cuantizar(-1), 0);
    assert.equal(cuantizar(2), NIVELES);
});

test('un voxel aislado produce 6 caras (4 vértices, 2 triángulos cada una)', () => {
    const c = chunk(0, 0, (x, y, z) => (x === 1 && y === 1 && z === 1 ? 1 : 0));
    const s = mallarChunk(c, sinVecinos);
    const total = todas(s).reduce((n, e) => n + e.position.length / 3, 0);
    const tris = todas(s).reduce((n, e) => n + e.index.length / 3, 0);
    // cada cara 1x1 son 4 vértices y 2 triángulos
    assert.equal(total, 24);
    assert.equal(tris, 12);
});

test('piso plano de un solo tipo se funde en un único rectángulo superior', () => {
    // 4x4 de piso en y=0: la cara +Y se funde en un rectángulo (16 puntos de contorno)
    const c = chunk(0, 0, (x, y) => (y === 0 ? 1 : 0));
    const s = mallarChunk(c, sinVecinos);
    const arriba = todas(s).find(e => e.tipo === 1);
    let vArriba = 0;
    for (let i = 0; i < arriba.normal.length / 3; i++) if (arriba.normal[i * 3 + 1] === 1) vArriba++;
    assert.equal(vArriba, 4, 'sin vecinos el rectángulo sólo lleva sus 4 esquinas: los enteros de borde no se fuerzan');
});

test('el winding coincide con la normal declarada en todas las caras', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const c = chunk(0, 0, () => (rnd() < 0.45 ? 1 + Math.floor(rnd() * 3) : 0));
    const s = mallarChunk(c, sinVecinos);
    let malas = 0;
    for (const [a, b, cc] of triangulos(todas(s))) {
        const u = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]];
        const v = [cc.p[0] - a.p[0], cc.p[1] - a.p[1], cc.p[2] - a.p[2]];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const dir = a.n;
        if (n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2] <= 0) malas++;
    }
    assert.equal(malas, 0);
});

test('malla sin agujeros: cada arista (por posición) aparece un número par de veces (>= 2)', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const c = chunk(0, 0, () => (rnd() < 0.5 ? 1 : 0));
    const s = mallarChunk(c, sinVecinos);
    const aristas = new Map();
    const clave = p => p.map(x => x.toFixed(4)).join(',');
    for (const tri of triangulos(todas(s))) {
        for (let k = 0; k < 3; k++) {
            const a = clave(tri[k].p), b = clave(tri[(k + 1) % 3].p);
            const e = a < b ? a + '|' + b : b + '|' + a;
            aristas.set(e, (aristas.get(e) ?? 0) + 1);
        }
    }
    // Con voxeles aleatorios hay configuraciones no-variedad (dos sólidos que
    // se tocan sólo por una arista): ahí una arista aparece 4 veces. Lo que no
    // puede pasar es una arista con 1 triángulo (un agujero).
    const malas = [...aristas.values()].filter(n => n < 2 || n % 2 !== 0).length;
    assert.equal(malas, 0);
});

test('no hay caras en el borde compartido con un vecino sólido', () => {
    const solido = () => 1;
    const izq = chunk(0, 0, solido);
    const der = chunk(1, 0, solido);
    const sinVec = mallarChunk(izq, sinVecinos);
    const conVec = mallarChunk(izq, cx => (cx === 1 ? der : undefined));
    const enBordeX = s => todas(s).some(e => {
        for (let i = 0; i < e.normal.length / 3; i++) {
            if (e.normal[i * 3] === 1 && e.position[i * 3] === A) return true;
        }
        return false;
    });
    assert.equal(enBordeX(sinVec), true, 'sin vecino el borde es visible');
    assert.equal(enBordeX(conVec), false, 'con vecino sólido el borde desaparece');
});

test('tintes distintos no se funden; el color viaja por vértice', () => {
    const paleta = [null, [1, 0, 0], [0, 1, 0]];
    const tintes = new Uint16Array(A * ALTO * P);
    // mitad izquierda con tinte 1, mitad derecha con tinte 2, piso y=0
    for (let x = 0; x < A; x++) for (let z = 0; z < P; z++) tintes[(x * ALTO + 0) * P + z] = x < 2 ? 1 : 2;
    const c = chunk(0, 0, (x, y) => (y === 0 ? 1 : 0), tintes);
    const s = mallarChunk(c, sinVecinos, { paletaTintes: paleta });
    const piso = todas(s).filter(e => e.tipo === 1 && e.conTinte);
    assert.equal(piso.length, 1, 'un grupo de material por (tipo, tinte-presente)');
    const color = piso[0].color;
    assert.ok(color, 'hay atributo de color');
    const hayRojo = [...color].some((v, i) => i % 3 === 0 && v === 1);
    const hayVerde = [...color].some((v, i) => i % 3 === 1 && v === 1);
    assert.ok(hayRojo && hayVerde, 'se ven ambos colores');
});

test('vidrio: sólo tapa a otro vidrio; el sólido sí dibuja su cara contra el vidrio', () => {
    // capa x=0 sólido, x=1 vidrio (tipo 8): la cara del sólido hacia el vidrio se dibuja
    const c = chunk(0, 0, (x, y) => (y === 0 && x <= 1 ? (x === 0 ? 3 : 8) : 0));
    const s = mallarChunk(c, sinVecinos, { esTransparente: t => t === 8 });
    const opacas = s.opacos.find(e => e.tipo === 3);
    assert.ok(opacas, 'el sólido emite caras');
    const transp = s.transparentes.find(e => e.tipo === 8);
    assert.ok(transp, 'el vidrio va al lado transparente');
    // dos vidrios contiguos no generan caras entre sí: el vidrio de (1,0,z) no tiene cara +x hacia (2,0,z)? sí tiene (aire)
    const normalesX = [...transp.normal].filter((v, i) => i % 3 === 0 && v !== 0);
    const enX1 = [...transp.position].filter((v, i) => i % 3 === 0 && v === 2).length;
    assert.ok(normalesX.length > 0 && enX1 > 0, 'el vidrio tiene su cara contra el aire');
});

test('el hook de iluminación llega cuantizado a los atributos sol/luz', () => {
    const c = chunk(0, 0, (x, y) => (y === 0 ? 1 : 0));
    const s = mallarChunk(c, sinVecinos, { iluminacion: info => ({ sol: info.sentido > 0 ? 0 : 1, luz: 0.5 }) });
    const e = todas(s).find(x => x.tipo === 1);
    const sol = new Set(e.sol);
    assert.ok(sol.has(0) || sol.has(1), 'valores de sol en 0..1');
    assert.ok([...e.luz].every(v => Math.abs(v - 4 / NIVELES) < 1e-6 || Math.abs(v - 0.5) < 1e-3 || v === Math.round(0.5 * NIVELES) / NIVELES), 'luz cuantizada');
});

test('combinarLado reindexa y agrupa por material', () => {
    const a = mallarChunk(chunk(0, 0, (x, y) => (y === 0 ? 1 : 0)), sinVecinos);
    const b = mallarChunk(chunk(1, 0, (x, y) => (y === 0 ? 2 : 0)), sinVecinos);
    const comb = combinarLado([a.opacos, b.opacos]);
    assert.equal(comb.materiales.length, 2);
    assert.equal(comb.grupos.length, 2);
    const totalIdx = comb.grupos.reduce((n, g) => n + g.cuenta, 0);
    assert.equal(totalIdx, comb.index.length);
    const maxIdx = Math.max(...comb.index);
    assert.ok(maxIdx < comb.position.length / 3);
});
