// three.js - Adaptador a three.js (peer dependency). Convierte la salida de
// `MapaVoxel.combinarRegion` / `combinarTodo` en Mesh con un grupo por material.
//
// El paquete núcleo NO importa three: este módulo recibe la instancia `THREE`
// como parámetro para no forzar la versión ni cargarla en el worker.

/**
 * @param {typeof import('three')} THREE
 * @param {Object} lado               resultado de combinarLado ({ position, ..., grupos, materiales })
 * @param {Object} opts
 * @param {(tipo:number, conTinte:boolean, lado:'opacos'|'transparentes') => THREE.Material} opts.materialDe
 *        fábrica de materiales; el consumidor decide texturas. Se llama una vez por material.
 * @param {'opacos'|'transparentes'} [opts.lado='opacos']
 * @param {string} [opts.nombre]
 * @returns {THREE.Mesh|null}
 */
export function crearMallaLado(THREE, lado, { materialDe, lado: nombreLado = 'opacos', nombre = 'mapa_voxel' } = {}) {
    if (!lado) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(lado.position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(lado.normal, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(lado.uv, 2));
    if (lado.color) geo.setAttribute('color', new THREE.BufferAttribute(lado.color, 3));
    geo.setAttribute('sol', new THREE.BufferAttribute(lado.sol, 1));
    geo.setAttribute('luz', new THREE.BufferAttribute(lado.luz, 1));
    geo.setIndex(new THREE.BufferAttribute(lado.index, 1));

    const materiales = lado.materiales.map(m => materialDe(m.tipo, m.conTinte, nombreLado));
    if (materiales.length === 1) {
        geo.clearGroups();
    } else {
        for (const g of lado.grupos) geo.addGroup(g.inicio, g.cuenta, g.materialIndex);
    }
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, materiales.length === 1 ? materiales[0] : materiales);
    mesh.name = nombre + '_' + nombreLado;
    // Las posiciones van en coordenadas de mundo: el mesh queda en el origen.
    mesh.frustumCulled = true;
    return mesh;
}

/**
 * Una malla por región (grupos de `mapa.regionTamano`² chunks) para que three.js
 * haga frustum culling: con `combinarTodo()` el mapa es una sola malla y se dibuja
 * entero en cada frame. Pensado para mapas estáticos grandes.
 *
 * @param {typeof import('three')} THREE
 * @param {import('./mapa.js').MapaVoxel} mapa  con los chunks ya mallados (p. ej. tras `congelar()`)
 * @param {Object} opts
 * @param {Function} opts.materialDe   ver `crearMallaLado` (use `cacheDeMateriales` para compartir materiales)
 * @param {string} [opts.nombre]
 * @param {boolean} [opts.transparentes=false]  incluir también el lado transparente
 * @returns {{ opacos: THREE.Mesh[], transparentes: THREE.Mesh[] }}
 */
export function crearMallasPorRegion(THREE, mapa, { materialDe, nombre = 'mapa_voxel', transparentes = false } = {}) {
    const regiones = new Set();
    for (const k of mapa.salidas.keys()) {
        const [cx, cz] = k.split('_').map(Number);
        regiones.add(mapa.regionDe(cx, cz));
    }
    const out = { opacos: [], transparentes: [] };
    for (const r of regiones) {
        const comb = mapa.combinarRegion(r);
        if (!comb) continue;
        const lados = transparentes ? ['opacos', 'transparentes'] : ['opacos'];
        for (const lado of lados) {
            const mesh = crearMallaLado(THREE, comb[lado], { materialDe, lado, nombre: nombre + '_' + r });
            if (mesh) out[lado].push(mesh);
        }
    }
    return out;
}

/**
 * Caché de materiales por (tipo, conTinte, lado). Evita crear un material por
 * región: todas las regiones comparten los mismos.
 * @param {(tipo:number, conTinte:boolean, lado:string) => any} fabrica
 */
export function cacheDeMateriales(fabrica) {
    const mapa = new Map();
    return (tipo, conTinte, lado) => {
        const k = tipo + '|' + (conTinte ? 1 : 0) + '|' + lado;
        let m = mapa.get(k);
        if (!m) { m = fabrica(tipo, conTinte, lado); mapa.set(k, m); }
        return m;
    };
}

/** Libera la geometría de un mesh (los materiales se comparten y no se tocan). */
export function liberarMalla(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
}
