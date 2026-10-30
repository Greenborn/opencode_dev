// Utilidades puras para describir el elemento del DOM sobre el que se hizo clic derecho.
// Sin dependencias de Vue, para poder probarlas de forma aislada.

export const MAX_PROFUNDIDAD_SELECTOR = 6;
export const MAX_TEXTO_ELEMENTO = 120;
export const MAX_LOCALIZACION = 255;

function descripcionNodo(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const clases = typeof el.className === 'string'
    ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join('')
    : '';

  let indice = '';
  const padre = el.parentElement;
  if (padre && !el.id) {
    const hermanos = Array.from(padre.children).filter((h) => h.tagName === el.tagName);
    if (hermanos.length > 1) {
      indice = `:nth-of-type(${hermanos.indexOf(el) + 1})`;
    }
  }
  return `${tag}${id}${clases}${indice}`;
}

/**
 * Ruta legible desde el elemento hasta `body` (o hasta MAX_PROFUNDIDAD_SELECTOR niveles).
 * Ejemplo: "body > div#app > main.contenido > button:nth-of-type(2)".
 */
export function construirSelector(el) {
  const partes = [];
  let actual = el;
  while (actual && actual.nodeType === Node.ELEMENT_NODE && partes.length < MAX_PROFUNDIDAD_SELECTOR) {
    if (actual === document.body) {
      partes.unshift('body');
      break;
    }
    partes.unshift(descripcionNodo(actual));
    actual = actual.parentElement;
  }
  return partes.join(' > ');
}

/**
 * Texto visible del elemento, recortado. Usa innerText (lo que ve el usuario) y cae a
 * textContent solo cuando el elemento no tiene render (p. ej. SVG o nodos ocultos).
 */
export function extraerTexto(el) {
  const crudo = el.innerText ?? el.textContent ?? '';
  const limpio = crudo.replace(/\s+/g, ' ').trim();
  return limpio.length > MAX_TEXTO_ELEMENTO ? `${limpio.slice(0, MAX_TEXTO_ELEMENTO)}…` : limpio;
}

/**
 * Heurística de dispositivo móvil: combina la cadena del navegador con el tipo de puntero.
 * Se evalúa en el momento del reporte y no depende de dependencias externas.
 */
export function esDispositivoMovil() {
  const ua = navigator.userAgent || '';
  const uaMovil = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua);
  const punteroGrueso = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  return uaMovil || punteroGrueso;
}

/**
 * Información del elemento para precompletar el reporte.
 * Si el elemento (o un ancestro) tiene `data-reporte="..."`, esa etiqueta pasa a ser la
 * localización: permite nombrar componentes de forma estable en lugar de depender de la ruta.
 * También se adjunta el contexto del navegador en el que se tomó la nota.
 */
export function obtenerInfoElemento(el) {
  const marcado = el.closest('[data-reporte]');
  const selector = construirSelector(el);
  const localizacion = marcado ? marcado.getAttribute('data-reporte') : selector;

  return {
    localizacion: localizacion.slice(0, MAX_LOCALIZACION),
    selector: selector.slice(0, MAX_LOCALIZACION),
    tag: el.tagName.toLowerCase(),
    texto: extraerTexto(el),
    url: window.location.href,
    navegador: navigator.userAgent || '',
    ancho_viewport: window.innerWidth,
    alto_viewport: window.innerHeight,
    es_movil: esDispositivoMovil(),
  };
}
