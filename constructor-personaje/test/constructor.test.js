import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    configDefecto, categorias, azarPersonaje, girar, normalizarConfig,
    CONFIG_DEFECTO, ROTACIONES, NOMBRE_MAX,
} from '../src/index.js';
import { generadorSembrado } from '@greenborn/modelos-personajes/geometria';
import { CATALOGO_ACCESORIOS, COLORES_ACCESORIO } from '@greenborn/accesorios-personaje/catalogo';

test('configDefecto devuelve copias independientes de CONFIG_DEFECTO', () => {
    const a = configDefecto();
    a.pelo = 3;
    assert.equal(CONFIG_DEFECTO.pelo, 0);
    assert.deepEqual(configDefecto(), { ...CONFIG_DEFECTO });
});

test('categorias: claves únicas y cada opción tiene texto o color', () => {
    const cats = categorias();
    const keys = cats.map(c => c.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const c of cats) {
        assert.ok(c.items.length > 0, c.key);
        for (const it of c.items) assert.ok(it.label || it.c, c.key);
    }
});

test('categorias de accesorios reflejan el catálogo del paquete', () => {
    const cats = Object.fromEntries(categorias().map(c => [c.key, c]));
    assert.equal(cats.cabeza.items.length, CATALOGO_ACCESORIOS.cabeza.length);
    assert.equal(cats.lentes.items.length, CATALOGO_ACCESORIOS.lentes.length);
    assert.equal(cats.cabezaColor.items.length, COLORES_ACCESORIO.length);
    assert.equal(cats.cabeza.items[1].label, 'Gorra');
});

test('azarPersonaje con semilla fija es reproducible y no incluye rot', () => {
    const a = azarPersonaje(generadorSembrado(42));
    const b = azarPersonaje(generadorSembrado(42));
    assert.deepEqual(a, b);
    assert.equal('rot' in a, false);
    assert.ok('semillaCanasta' in a);
    assert.ok(typeof a.nombre === 'string' && typeof a.piel === 'string');
});

test('girar avanza una vuelta de cuarto y cierra el ciclo', () => {
    let cfg = configDefecto();
    const orden = [];
    for (let i = 0; i < ROTACIONES; i++) {
        cfg = girar(cfg);
        orden.push(cfg.rot);
    }
    assert.deepEqual(orden, [1, 2, 3, 0]);
    assert.equal(configDefecto().rot, 0);
});

test('normalizarConfig corrige valores fuera de rango y recorta el nombre', () => {
    const out = normalizarConfig({
        rot: 9, cabeza: 99, lentes: 1, piel: 'rojo', nombre: 'x'.repeat(50),
    });
    assert.equal(out.rot, 0);
    assert.equal(out.cabeza, 0);
    assert.equal(out.lentes, 1);
    assert.match(out.piel, /^#[0-9a-f]{6}$/i);
    assert.equal(out.nombre.length, NOMBRE_MAX);
});

test('normalizarConfig sin argumentos da una config válida', () => {
    const out = normalizarConfig();
    assert.equal(out.rot, 0);
    assert.equal(out.nombre, CONFIG_DEFECTO.nombre);
    assert.match(out.piel, /^#[0-9a-f]{6}$/i);
});

test('la canasta es obligatoria: defecto, azar y normalizar la fuerzan y el panel no ofrece "mano"', () => {
    assert.equal(configDefecto().mano, 1);
    assert.equal(azarPersonaje(generadorSembrado(7)).mano, 1);
    assert.equal(normalizarConfig({ mano: 0 }).mano, 1);
    assert.ok(!categorias().some(c => c.key === 'mano'));
});
