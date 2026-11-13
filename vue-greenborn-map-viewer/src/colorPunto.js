// Resuelve el color de relleno de un punto: usa punto.color (string CSS válido)
// y, si falta o es inválido, cae al color global.
const COLOR_SEGURO = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30}|(rgb|rgba|hsl|hsla)\([0-9a-zA-Z\s.,%/-]{1,60}\))$/

export function resolverColorPunto(punto, colorGlobal) {
  const c = punto && typeof punto.color === 'string' ? punto.color.trim() : ''
  return c && COLOR_SEGURO.test(c) ? c : colorGlobal
}
