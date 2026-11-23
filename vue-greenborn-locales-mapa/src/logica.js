export const TERMINOS_POR_DEFECTO = Object.freeze({ singular: 'negocio', plural: 'negocios' });

export function terminosCompletos(terminos = {}) {
  return { ...TERMINOS_POR_DEFECTO, ...terminos };
}

// Enlace para llegar en apps de mapas. Sólo con coordenadas válidas; si no, null
// (nunca se inventa una ubicación).
export function urlComoLlegar(lat, lng) {
  const ok =
    typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
  if (!ok) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Convierte locales del backend al formato de puntos del visor. Omite los sin coordenadas. */
export function localesAPuntos(locales = []) {
  return locales
    .filter((l) => typeof l.latitud === 'number' && typeof l.longitud === 'number')
    .map((l) => ({
      id: l.id,
      lat: l.latitud,
      lng: l.longitud,
      nombre: [l.calle, l.numero].filter(Boolean).join(' ') || `Local ${l.id}`,
    }));
}

export function direccionLegible(local) {
  const partes = [local.calle, local.numero, local.ciudad].filter((x) => x !== undefined && x !== null && x !== '');
  return partes.join(', ');
}
