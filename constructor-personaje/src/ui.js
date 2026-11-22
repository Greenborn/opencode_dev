// Panel DOM del constructor. No conoce three.js ni el estado del juego: emite eventos y muestra la
// config que le pasan con `pintar(cfg)`. Los estilos los pone la página (ver README, clases `cp-*`,
// `card`, `row`, `col`, `cat`, `cat-h`, `chips`, `sw`, `toolbar`, `caption`, `muted`).

let secuencia = 0;

function el(tag, props = {}, hijos = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'texto') e.textContent = v;
        else if (k === 'clase') e.className = v;
        else e.setAttribute(k, String(v));
    }
    e.append(...hijos);
    return e;
}

/**
 * Monta el panel dentro de `contenedor` (se vacía antes).
 * `eventos`: onNombre(texto), onPiel(hex), onColor(clave, hex), onElegir(clave, indice), onGirar(), onAzar(), onReiniciar().
 *   Las categorías con `libre: true` muestran además un selector de color (cualquier #rrggbb) que emite onColor.
 * Devuelve { canvas, pie, pintar(cfg), sinVista(mensaje), destruir() }.
 *   - canvas: donde dibuja la vista 3D.
 *   - pie: bloque bajo los botones de la izquierda, para que la página agregue su botón de acción.
 */
export function crearPanel(contenedor, categorias, eventos) {
    contenedor.replaceChildren();
    const id = `cp-nombre-${++secuencia}`;

    const canvas = el('canvas', { clase: 'cp-canvas', width: 420, height: 420 });
    const caption = el('div', { clase: 'caption' });
    const pie = el('div', { clase: 'cp-pie' });
    const boton = (texto, onClick) => {
        const b = el('button', { type: 'button', texto });
        b.addEventListener('click', onClick);
        return b;
    };
    const izquierda = el('div', { clase: 'col', estilo: 'flex:0 1 440px' }, [
        el('div', { clase: 'card' }, [
            canvas,
            caption,
            el('div', { clase: 'toolbar', estilo: 'margin-top:10px' }, [
                boton('↻ Girar', () => eventos.onGirar()),
                boton('Aleatorio', () => eventos.onAzar()),
                boton('Reiniciar', () => eventos.onReiniciar()),
            ]),
            pie,
        ]),
    ]);

    const inputNombre = el('input', { type: 'text', id, maxlength: 20, placeholder: 'Cómo te llaman en la calle' });
    inputNombre.addEventListener('input', () => eventos.onNombre(inputNombre.value));

    const inputPiel = el('input', { type: 'color', 'aria-label': 'Color de piel libre' });
    const hexPiel = el('span', { clase: 'muted' });
    inputPiel.addEventListener('input', () => eventos.onPiel(inputPiel.value));

    const chips = [];
    const libres = [];   // selectores de color libre: { key, items, inp }
    const contCategorias = el('div', { clase: 'cp-cats' });
    for (const cat of categorias) {
        const chipsCat = el('div', { clase: 'chips' });
        cat.items.forEach((it, idx) => {
            const b = el('button', { type: 'button' });
            if (it.c) b.append(el('span', { clase: 'sw', estilo: `background:${it.c}` }));
            if (it.label) b.append(document.createTextNode(it.label));
            b.addEventListener('click', () => eventos.onElegir(cat.key, idx));
            chips.push({ key: cat.key, idx, b });
            chipsCat.append(b);
        });
        const cabecera = el('div', { clase: 'cat-h', texto: cat.label });
        if (cat.libre) {
            const inp = el('input', { type: 'color', 'aria-label': `${cat.label}: color libre` });
            inp.addEventListener('input', () => eventos.onColor(cat.key, inp.value));
            libres.push({ key: cat.key, items: cat.items, inp });
            cabecera.append(' ', inp);
        }
        contCategorias.append(el('div', { clase: 'cat' }, [cabecera, chipsCat]));
    }

    const derecha = el('div', { clase: 'col' }, [
        el('div', { clase: 'card' }, [
            el('label', { clase: 'cat-h', for: id, texto: 'Nombre' }),
            inputNombre,
            el('div', { estilo: 'height:14px' }),
            el('div', { clase: 'cat' }, [
                el('div', { clase: 'cat-h', texto: 'Color de piel' }),
                el('div', { clase: 'toolbar', estilo: 'margin:0' }, [inputPiel, hexPiel]),
            ]),
            contCategorias,
        ]),
    ]);

    contenedor.append(el('div', { clase: 'row' }, [izquierda, derecha]));

    return {
        canvas,
        pie,
        pintar(cfg) {
            for (const { key, idx, b } of chips) b.classList.toggle('on', cfg[key] === idx);
            // Color libre (#rrggbb) o índice de paleta: el selector muestra el color que está en uso.
            for (const { key, items, inp } of libres) {
                const v = cfg[key];
                if (typeof v === 'string') inp.value = v;
                else if (items[v]?.c) inp.value = items[v].c;
            }
            inputPiel.value = cfg.piel;
            hexPiel.textContent = cfg.piel;
            inputNombre.value = cfg.nombre;
            caption.textContent = cfg.nombre || 'Sin nombre';
        },
        sinVista(mensaje) {
            canvas.replaceWith(el('p', { clase: 'muted', texto: mensaje }));
        },
        destruir() {
            contenedor.replaceChildren();
        },
    };
}
