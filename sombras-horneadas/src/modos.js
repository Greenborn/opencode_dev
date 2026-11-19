// Reglas de los tres modos de sombreado de un mapa voxel.
//
//   'baked'    todo cocinado: el sol del terreno se hornea por cara INCLUYENDO la
//              sombra de árboles y postes. Árboles y postes no proyectan ni
//              reciben en el shadow map.
//   'mixto'    árboles y postes dinámicos, el resto cocinado: el terreno sigue
//              horneado sólo con edificios; árboles y postes proyectan en tiempo real.
//   'realtime' todo dinámico: el terreno y las entidades proyectan en el shadow map.
//
// Módulo puro (sin three.js ni DOM): apto para el hilo principal y para un Web Worker.

export const MODOS_SOMBRA = Object.freeze(['baked', 'mixto', 'realtime']);

/** Modo por defecto cuando el valor recibido no es válido. */
export const MODO_POR_DEFECTO = 'baked';

/** Modo válido o el de por defecto. */
export function modoSombraValido(modo) {
    return MODOS_SOMBRA.includes(modo) ? modo : MODO_POR_DEFECTO;
}

/** ¿El terreno proyecta en el shadow map? Sólo en 'realtime'. */
export function terrenoProyecta(modo) {
    return modoSombraValido(modo) === 'realtime';
}

/** ¿Árboles y postes proyectan (y reciben) en el shadow map? En 'mixto' y 'realtime'. */
export function entidadesProyectan(modo) {
    return modoSombraValido(modo) !== 'baked';
}

/** ¿El sol horneado incluye la sombra de árboles y postes? Sólo en 'baked'. */
export function solIncluyeEntidades(modo) {
    return modoSombraValido(modo) === 'baked';
}

/** ¿El sol del terreno se hornea (atributo `sol` + sombra de contacto)? En todo modo menos 'realtime'. */
export function solHorneadoActivo(modo) {
    return modoSombraValido(modo) !== 'realtime';
}
