// registro.js - API para que el consumidor registre los plugins de datos.
//
//   registrarPlugins({
//     arboles:   { elegirArbol },
//     autos:     { AUTOS, ORDEN_AUTOS, idEntidadAuto, PROPORCION_MOTOS },
//     ...                       // ver ESQUEMA_PLUGINS en datos.js
//   });
//
// Cada plugin es opcional por separado, pero `construirMapa` exige que estén
// todos (ver `pluginsFaltantes`). Se pueden registrar en varias llamadas: cada
// una pisa sólo los plugins que trae.

import { ESQUEMA_PLUGINS, asignarDatos } from './datos.js';

const registrados = new Set();

/**
 * Registra uno o más plugins. Lanza `TypeError` si un plugin es desconocido o
 * si le faltan nombres según `ESQUEMA_PLUGINS`.
 */
export function registrarPlugins(plugins) {
    if (!plugins || typeof plugins !== 'object') {
        throw new TypeError('registrarPlugins: se esperaba un objeto { nombre: datos }');
    }
    for (const nombre of Object.keys(plugins)) {
        const requeridos = ESQUEMA_PLUGINS[nombre];
        if (!requeridos) {
            throw new TypeError(`registrarPlugins: plugin desconocido "${nombre}"`);
        }
        const valores = plugins[nombre] || {};
        const faltan = requeridos.filter(n => valores[n] === undefined);
        if (faltan.length) {
            throw new TypeError(`registrarPlugins: el plugin "${nombre}" no trae: ${faltan.join(', ')}`);
        }
        asignarDatos(nombre, valores);
        registrados.add(nombre);
    }
}

/** Nombres de plugins que todavía no se registraron. Vacío = listo para generar. */
export function pluginsFaltantes() {
    return Object.keys(ESQUEMA_PLUGINS).filter(n => !registrados.has(n));
}

/** Plugins ya registrados (copia). */
export function pluginsRegistrados() {
    return [...registrados];
}
