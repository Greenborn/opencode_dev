// Dibujo de bounding boxes sobre un canvas superpuesto a un video/imagen.
// El canvas debe tener tamaño en px CSS igual al elemento visible; las
// detecciones vienen en coordenadas naturales del frame (anchoNatural x
// altoNatural) y se reescalan al tamaño real del canvas.
export function dibujarDetecciones(canvas, detecciones, anchoNatural, altoNatural, opciones = {}) {
  if (!canvas || !anchoNatural || !altoNatural) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const {
    grosor = 2,
    fuente = '13px system-ui, sans-serif',
    mostrarEtiquetas = true,
    mostrarScore = true,
    colorTexto = '#10131a',
  } = opciones

  const scaleX = canvas.width / anchoNatural
  const scaleY = canvas.height / altoNatural

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = grosor
  ctx.font = fuente

  for (const d of detecciones || []) {
    if (!d || !d.p1 || !d.p2) continue
    const x = d.p1.x * scaleX
    const y = d.p1.y * scaleY
    const w = (d.p2.x - d.p1.x) * scaleX
    const h = (d.p2.y - d.p1.y) * scaleY
    const color = colorClase(d.id)

    ctx.strokeStyle = color
    ctx.strokeRect(x, y, w, h)

    if (!mostrarEtiquetas) continue
    const porcentaje = typeof d.score === 'number' ? ` ${(d.score * 100).toFixed(0)}%` : ''
    const label = `${d.name ?? d.id}${mostrarScore ? porcentaje : ''}`
    const tw = ctx.measureText(label).width + 8
    const ly = Math.max(0, y - 18)
    ctx.fillStyle = color
    ctx.fillRect(x, ly, tw, 16)
    ctx.fillStyle = colorTexto
    ctx.fillText(label, x + 4, ly + 12.5)
  }
}

export function colorClase(id) {
  return `hsl(${((Number(id) || 0) * 47) % 360} 75% 55%)`
}

export const drawDetections = dibujarDetecciones
export const classColor = colorClase
