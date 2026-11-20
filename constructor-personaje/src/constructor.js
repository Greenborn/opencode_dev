// Constructor del personaje: une la config (./index), el panel DOM (./ui) y la vista 3D (./three).
// La vista se carga aparte: si three.js no está disponible, el panel funciona igual y muestra un aviso.

import { configDefecto, normalizarConfig, azarPersonaje, girar, categorias, NOMBRE_MAX } from './index.js';
import { crearPanel } from './ui.js';

/**
 * Monta el constructor dentro de `contenedor`.
 *   configInicial: config parcial o completa; lo que falte toma el valor por defecto.
 *   alCambiar(cfg): se llama con la config nueva después de cada cambio (objeto nuevo, no mutado).
 *   vista: opciones de crearVistaPrevia (fondo, alto, mitadVista, centroY). Se pasa `canvas` solo.
 * Devuelve { cfg (getter), pie, redimensionar(), destruir() }.
 */
export async function montarConstructorPersonaje({ contenedor, configInicial = {}, alCambiar = () => {}, vista = {} }) {
    let cfg = normalizarConfig({ ...configDefecto(), ...configInicial });
    let motor = null;

    function aplicar(parcial) {
        cfg = { ...cfg, ...parcial };
        panel.pintar(cfg);
        motor?.mostrar(cfg);
        alCambiar(cfg);
    }

    const panel = crearPanel(contenedor, categorias(), {
        onNombre: texto => aplicar({ nombre: texto.slice(0, NOMBRE_MAX) }),
        onPiel: hex => aplicar({ piel: hex.toLowerCase() }),
        onElegir: (clave, idx) => aplicar({ [clave]: idx }),
        onGirar: () => aplicar(girar(cfg)),
        onAzar: () => aplicar(azarPersonaje()),
        onReiniciar: () => aplicar(configDefecto()),
    });
    panel.pintar(cfg);

    try {
        const { crearVistaPrevia } = await import('./three.js');
        motor = await crearVistaPrevia({ canvas: panel.canvas, ...vista });
        motor.mostrar(cfg);
    } catch (e) {
        console.warn('[constructor-personaje] vista 3D no disponible:', e);
        panel.sinVista('Vista 3D no disponible en este navegador.');
    }

    return {
        get cfg() { return cfg; },
        pie: panel.pie,
        redimensionar() { motor?.redimensionar(); },
        destruir() { motor?.destruir(); panel.destruir(); },
    };
}
