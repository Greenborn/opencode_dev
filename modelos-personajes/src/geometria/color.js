// Utilidades de color #rrggbb para el personaje voxel. Lógica pura.
// Las fórmulas son las del constructor original (ideas_juegos_virales) para que
// un mismo personaje salga igual en el juego y en el paquete.

/** Multiplica el color por f (sombreado plano); devuelve #rrggbb. */
export function tint(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0');
    return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}

/** Mezcla dos #rrggbb: t=0 es `a`, t=1 es `b`. */
export function mezclar(a, b, t) {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0');
    return '#' + ch(16) + ch(8) + ch(0);
}

/** Luminancia aproximada 0..255 de un #rrggbb. */
export function luz(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .6 + (n & 255) * .1;
}
