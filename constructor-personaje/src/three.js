// Vista 3D del constructor y muñeco del personaje, en three.js.
// Requiere `three` como peer; debe resolver a la build WebGPU (three.webgpu.js), igual que el juego,
// porque el paquete de personajes usa NodeMaterial.

import * as THREE from 'three';
import { crearPersonajeVoxel, animarCaminataVoxel, aplicarInclinacion } from '@greenborn/modelos-personajes/three';
import { escalaVoxelParaAlto } from '@greenborn/modelos-personajes/geometria';
import { adjuntarAccesorios } from '@greenborn/accesorios-personaje/three';
import { ALTO_PERSONAJE_M } from './index.js';

/**
 * Muñeco completo (cuerpo + accesorios) escalado a `alto`, en la unidad que elija el llamador
 * (metros, celdas del mapa, etc.). root.userData = { modelo, partes } para las poses.
 */
export function construirMuneco(cfg, { alto = ALTO_PERSONAJE_M } = {}) {
    const { group, partes } = adjuntarAccesorios(crearPersonajeVoxel(cfg), cfg);
    group.scale.setScalar(escalaVoxelParaAlto(alto));
    const root = new THREE.Group();
    root.add(group);
    root.userData = { modelo: group, partes };
    return root;
}

/**
 * Pose de caminata y de inclinación al correr. `p` = { fase, fuerza, corre, dt }, que sale de
 * avanzarFase de @greenborn/modelos-personajes/animacion.
 */
export function animarMuneco(root, p) {
    const { modelo, partes } = root.userData;
    animarCaminataVoxel(partes, p.fase, p.fuerza);
    aplicarInclinacion(modelo, p.corre, p.dt || 0);
}

function luces(escena) {
    escena.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d = new THREE.DirectionalLight(0xffffff, 0.8);
    d.position.set(0.4, 1, 0.7);
    escena.add(d);
}

/**
 * Vista ortográfica diagonal (yaw 45°, inclinación 40°) del muñeco, sobre un canvas cuadrado.
 *   alto: alto del muñeco en la unidad de la escena.
 *   mitadVista: semialto visible (por defecto 2.2 × alto).
 *   centroY: altura del punto que mira la cámara (por defecto alto / 2).
 * Devuelve { mostrar(cfg), redimensionar(), destruir() }. Lanza si el navegador no tiene WebGPU/WebGL.
 */
export async function crearVistaPrevia({
    canvas,
    fondo = '#e4dccd',
    alto = ALTO_PERSONAJE_M,
    mitadVista = 2.2 * alto,
    centroY = alto / 2,
}) {
    const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: true });
    await renderer.init();
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(fondo);
    luces(escena);
    const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    let muneco = null;
    let ultimo = null;

    function encuadrar() {
        const D = 50 * mitadVista;                       // distancia de la cámara: sólo afecta al recorte
        const yaw = Math.PI / 4;
        const cp = Math.cos(40 * Math.PI / 180), sp = Math.sin(40 * Math.PI / 180);
        camara.left = -mitadVista; camara.right = mitadVista;
        camara.top = mitadVista; camara.bottom = -mitadVista;
        camara.near = D * 0.01; camara.far = D * 4;
        camara.position.set(Math.sin(yaw) * cp * D, centroY + sp * D, Math.cos(yaw) * cp * D);
        camara.lookAt(0, centroY, 0);
        camara.updateProjectionMatrix();
    }

    return {
        mostrar(cfg) {
            ultimo = cfg;
            if (muneco) escena.remove(muneco);             // geometría y material son compartidos: no se liberan
            muneco = construirMuneco(cfg, { alto });
            muneco.rotation.y = -(cfg.rot || 0) * Math.PI / 2;   // rot 1 = -x, 2 = -z, 3 = +x
            escena.add(muneco);
            encuadrar();
            renderer.render(escena, camara);
        },
        redimensionar() {
            const w = canvas.clientWidth || 420;
            renderer.setSize(w, w, false);
            if (ultimo) this.mostrar(ultimo);
        },
        destruir() {
            if (muneco) escena.remove(muneco);
            renderer.dispose();
        },
    };
}
