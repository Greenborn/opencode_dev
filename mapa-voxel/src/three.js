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
 * @param {string[]} [opts.omitir]   atributos que el material no usa y no se suben a la GPU
 *        (ej. ['uv', 'luz'] con un material sin textura ni luz horneada). 'position' no se omite.
 * @returns {THREE.Mesh|null}
 */
export function crearMallaLado(THREE, lado, { materialDe, materialAtlas = null, lado: nombreLado = 'opacos', nombre = 'mapa_voxel', omitir = [] } = {}) {
    if (!lado) return null;
    const geo = new THREE.BufferGeometry();
    const poner = (n, arr, tam) => { if (arr && !omitir.includes(n)) geo.setAttribute(n, new THREE.BufferAttribute(arr, tam)); };
    geo.setAttribute('position', new THREE.BufferAttribute(lado.position, 3));
    poner('normal', lado.normal, 3);
    // modo atlas de caras: `uv` es la posición local en voxeles (atributo `uvCara`) y `region` el bloque
    if (lado.region) { poner('uvCara', lado.uv, 2); poner('region', lado.region, 4); }
    else poner('uv', lado.uv, 2);
    poner('color', lado.color, 3);
    poner('sol', lado.sol, 1);
    poner('luz', lado.luz, 1);
    geo.setIndex(new THREE.BufferAttribute(lado.index, 1));

    // con atlas de caras, el material depende del atlas combinado (una textura por geometría)
    const materiales = lado.region && materialAtlas
        ? [materialAtlas(lado.atlas, nombreLado)]
        : lado.materiales.map(m => materialDe(m.tipo, m.conTinte, nombreLado));
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
 * @param {string[]} [opts.omitir]  atributos que no se suben (ver `crearMallaLado`)
 * @returns {{ opacos: THREE.Mesh[], transparentes: THREE.Mesh[] }}
 */
export function crearMallasPorRegion(THREE, mapa, { materialDe, materialAtlas = null, nombre = 'mapa_voxel', transparentes = false, omitir = [] } = {}) {
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
            const mesh = crearMallaLado(THREE, comb[lado], { materialDe, materialAtlas, lado, nombre: nombre + '_' + r, omitir });
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

/**
 * Textura del atlas (ver atlas.js): Float32 RGBA lineal, NearestFilter, sin mipmaps.
 * Los datos ya son lineales (la paleta del mallador lo es), así que no se marca
 * colorSpace sRGB: three.js los trata como lineales (NoColorSpace).
 * @param {typeof import('three')} THREE
 * @param {{ancho:number, alto:number, datos:Float32Array}} atlas
 */
export function crearTexturaAtlas(THREE, atlas) {
    // RGBA8 sRGB (atlas de caras combinado): la GPU decodifica a lineal al muestrear.
    if (atlas.datos instanceof Uint8Array) {
        const t8 = new THREE.DataTexture(atlas.datos, atlas.ancho, atlas.alto, THREE.RGBAFormat, THREE.UnsignedByteType);
        t8.colorSpace = THREE.SRGBColorSpace;
        t8.magFilter = THREE.NearestFilter;
        t8.minFilter = THREE.NearestFilter;
        t8.generateMipmaps = false;
        t8.needsUpdate = true;
        return t8;
    }
    const tex = new THREE.DataTexture(atlas.datos, atlas.ancho, atlas.alto, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

/**
 * Material único para el buffer de la paleta (tipo TIPO_ATLAS, color por UV de la paleta; ruta anterior).
 * Para el atlas de caras usar `crearMaterialAtlasCaras`. Usar con
 * `cacheDeMateriales`: `materialDe(TIPO_ATLAS, false, lado)` devuelve este material.
 * @param {typeof import('three')} THREE
 * @param {{ancho:number, alto:number, datos:Float32Array}} atlas
 * @param {Object} [extra]  parámetros extra del material (p. ej. { roughness: 0.8 })
 */
export function crearMaterialAtlas(THREE, atlas, extra = {}) {
    return new THREE.MeshLambertMaterial({ map: crearTexturaAtlas(THREE, atlas), ...extra });
}

/**
 * Material del atlas de caras (modo atlas de caras, ver atlas.js). Un material por
 * geometría combinada: su textura es `lado.atlas`. El shader lee `region` (origen y
 * tamaño del bloque) y `uvCara` (posición local en voxeles), elige el texel con
 * floor() y lo muestrea con NearestFilter. Sin mipmaps: un texel por voxel.
 * Ejemplo de uso con crearMallasPorRegion:
 *   materialAtlas: atlas => crearMaterialAtlasCaras(THREE, atlas, { roughness: 0.8 })
 * Aviso: el ejemplo usa GLSL sobre MeshLambertMaterial (three.js r150 o superior, WebGL2).
 * @param {typeof import('three')} THREE
 * @param {{ancho:number, alto:number, datos:Uint8Array|Float32Array}} atlas  atlas combinado (lado.atlas, RGBA8 sRGB)
 * @param {Object} [extra]  parámetros extra del material
 */
export function crearMaterialAtlasCaras(THREE, atlas, extra = {}) {
    const tex = crearTexturaAtlas(THREE, atlas);
    const mat = new THREE.MeshLambertMaterial(extra);
    mat.customProgramCacheKey = () => 'mapa-voxel-atlas-caras';
    mat.onBeforeCompile = sh => {
        sh.uniforms.uAtlas = { value: tex };
        sh.uniforms.uAtlasSize = { value: new THREE.Vector2(atlas.ancho, atlas.alto) };
        sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec4 region;\nattribute vec2 uvCara;\nflat varying vec4 vRegion;\nvarying vec2 vLocal;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRegion = region;\n\tvLocal = uvCara;');
        sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nflat varying vec4 vRegion;\nvarying vec2 vLocal;\nuniform sampler2D uAtlas;\nuniform vec2 uAtlasSize;')
            .replace('#include <map_fragment>', `#include <map_fragment>
\tvec2 loc = clamp(vLocal, vec2(0.0), vRegion.zw - 1e-3);
\tvec2 texel = vRegion.xy + floor(loc) + 0.5;
\tdiffuseColor.rgb *= texture2D(uAtlas, texel / uAtlasSize).rgb;`);
    };
    return mat;
}

/** Libera la geometría de un mesh (los materiales se comparten y no se tocan). */
export function liberarMalla(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
}
