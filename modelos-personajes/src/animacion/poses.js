// Animación de personajes: cálculos PUROS (sin three.js ni DOM), aptos para un Web Worker
// o para el hilo principal. Cada función devuelve números; quien dibuja los aplica
// (ver src/three/animacion.js).
//
// Los valores por defecto son los que usa hoy el juego (jugador_remoto.js y
// cadaveres_zombies.js). Todos se pueden sobrescribir pasando `cfg`.
//
// Estados (en orden de prioridad): muerto > agachado > correr > caminar > quieto.

/** Constantes de la animación del juego. Se exportan para que el juego las lea/compare. */
export const ANIMACION = Object.freeze({
    /** Velocidad (bloques/s) a la que el ciclo de caminata va a pleno. */
    VEL_CAMINATA: 8,
    /** Avance de la fase por segundo = BASE + EXTRA * fuerza. */
    FASE_BASE: 4,
    FASE_EXTRA: 6,
    /** Por debajo de esta fuerza no se avanza la fase (evita temblor de pie). */
    FUERZA_MINIMA: 0.05,
    /** Inclinación hacia adelante al correr (radianes sobre X). */
    INCLINACION_CORRER: 0.14,
    /** Tasas de suavizado (1/s) de la inclinación y de la altura al agacharse. */
    TASA_INCLINAR: 8,
    TASA_AGACHAR: 10,
    /** Muerte del muñeco en pie: duración, giro máximo y caída (× alto de impacto). */
    MUERTE_DURACION_S: 0.5,
    MUERTE_GIRO: Math.PI * 0.35,
    MUERTE_CAIDA: 0.4,
    /** Tiempo tras el que el muñeco muerto se oculta del todo. */
    MUERTE_RETIRO_S: 10,
    /** Cadáver instanciado: caída, tiempo tirado, hundimiento (segundos). */
    CADAVER_CAIDA_S: 0.5,
    CADAVER_TENDIDO_S: 10,
    CADAVER_HUNDIR_S: 4,
    /** Cadáver: apoyo por encima del piso y hundimiento total (× alto de impacto). */
    CADAVER_LEVANTE: 0.15,
    CADAVER_PROFUNDIDAD: 0.6,
});

/** Cuántos segundos vive un cadáver desde su muerte antes de liberar su slot. */
export const VIDA_CADAVER_S = ANIMACION.CADAVER_TENDIDO_S + ANIMACION.CADAVER_HUNDIR_S;

/**
 * Avanza la fase del ciclo de caminata según la velocidad horizontal.
 * @param {number} fase        fase actual (radianes, sin acotar)
 * @param {number} velocidad   módulo de la velocidad horizontal (bloques/s)
 * @param {number} dt          segundos desde el frame anterior
 * @returns {{ fase: number, fuerza: number }}  fuerza 0..1 para `animarCaminata`
 */
export function avanzarFase(fase, velocidad, dt, cfg = {}) {
    const vel = cfg.VEL_CAMINATA ?? ANIMACION.VEL_CAMINATA;
    const fuerza = Math.min(1, Math.max(0, velocidad) / vel);
    if (fuerza > (cfg.FUERZA_MINIMA ?? ANIMACION.FUERZA_MINIMA)) {
        fase += dt * ((cfg.FASE_BASE ?? ANIMACION.FASE_BASE) + (cfg.FASE_EXTRA ?? ANIMACION.FASE_EXTRA) * fuerza);
    }
    return { fase, fuerza };
}

/** Suavizado exponencial hacia `objetivo` (tasa en 1/s). */
export function suavizar(actual, objetivo, dt, tasa) {
    return actual + (objetivo - actual) * Math.min(1, tasa * dt);
}

/**
 * Estado del personaje a partir de sus banderas. Sirve para elegir la animación
 * sin repetir la prioridad en cada sitio.
 * @returns {'muerto'|'agachado'|'correr'|'caminar'|'quieto'}
 */
export function estadoDe({ muerto = false, agachado = false, corriendo = false, velocidad = 0 } = {}) {
    if (muerto) return 'muerto';
    if (agachado) return 'agachado';
    if (corriendo) return 'correr';
    if (velocidad > 0.05) return 'caminar';
    return 'quieto';
}

/** Inclinación objetivo del cuerpo (radianes sobre X): hacia adelante al correr. */
export function inclinacionObjetivo(corriendo, cfg = {}) {
    return corriendo ? (cfg.INCLINACION_CORRER ?? ANIMACION.INCLINACION_CORRER) : 0;
}

/**
 * Pose de la muerte del muñeco en pie (jugador_remoto.js). `t` son los segundos desde la muerte.
 * @returns {{ giro: number, caida: number }}  giro sobre X del modelo y bajada en bloques
 *          (multiplicar `caida` por el alto de impacto del personaje).
 */
export function poseMuerte(t, altoImpacto = 1, cfg = {}) {
    const dur = cfg.MUERTE_DURACION_S ?? ANIMACION.MUERTE_DURACION_S;
    const giroMax = cfg.MUERTE_GIRO ?? ANIMACION.MUERTE_GIRO;
    const caidaFrac = cfg.MUERTE_CAIDA ?? ANIMACION.MUERTE_CAIDA;
    const p = Math.min(1, Math.max(0, t / dur));
    return { giro: p * giroMax, caida: p * altoImpacto * caidaFrac };
}

/** ¿Ya pasó el tiempo tras el que un muñeco muerto se oculta del todo? */
export function muertoOculto(t, cfg = {}) {
    return t >= (cfg.MUERTE_RETIRO_S ?? ANIMACION.MUERTE_RETIRO_S);
}

/**
 * Pose de un cadáver instanciado (cadaveres_zombies.js) en el segundo `t` desde su muerte.
 * - caída: ease-out de 0 a π/2 durante CADAVER_CAIDA_S (de pie a boca abajo, hacia adelante)
 * - tendido: quieto
 * - hundimiento: smoothstep desde el piso hasta CADAVER_PROFUNDIDAD × alto
 * @returns {{ angulo: number, hundimiento: number, terminado: boolean }}
 *          hundimiento en 0..1 (multiplicar por PROFUNDIDAD × alto).
 */
export function poseCadaver(t, cfg = {}) {
    const caidaS = cfg.CADAVER_CAIDA_S ?? ANIMACION.CADAVER_CAIDA_S;
    const tendidoS = cfg.CADAVER_TENDIDO_S ?? ANIMACION.CADAVER_TENDIDO_S;
    const hundirS = cfg.CADAVER_HUNDIR_S ?? ANIMACION.CADAVER_HUNDIR_S;
    const k = Math.min(1, t / caidaS);
    const angulo = (1 - (1 - k) * (1 - k)) * Math.PI / 2;
    const h = Math.min(1, Math.max(0, (t - tendidoS) / hundirS));
    const hundimiento = h * h * (3 - 2 * h);
    return { angulo, hundimiento, terminado: t >= tendidoS + hundirS };
}
