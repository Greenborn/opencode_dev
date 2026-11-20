// rng.js - Generador pseudoaleatorio determinista (xorshift32) en [0, 1).
// Misma secuencia que `rngSemilla` de `cliente/arboles_config.js`: la geometría
// de cada especie sale siempre igual a partir de su semilla.

export function rngSemilla(semilla) {
    let s = (semilla | 0) || 0x9e3779b9;
    return function siguiente() {
        s ^= s << 13; s |= 0;
        s ^= s >>> 17;
        s ^= s << 5; s |= 0;
        return ((s >>> 0) % 0x100000) / 0x100000;
    };
}
