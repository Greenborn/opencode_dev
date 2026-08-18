// Ordena tabs: si hay un orden guardado (array de ids), lo respeta de izquierda a
// derecha; las tabs nuevas sin posición fija se agregan al final ordenadas por
// `priority` (menor = primero). El default de priority es 50.
export function sortTabs(tabs, savedOrder) {
  const list = Array.isArray(tabs) ? tabs : []
  if (!savedOrder || !savedOrder.length) {
    return [...list].sort((a, b) => (a.priority || 50) - (b.priority || 50))
  }
  const ordered = []
  const used = new Set()
  for (const id of savedOrder) {
    const tab = list.find((t) => t.id === id)
    if (tab) {
      ordered.push(tab)
      used.add(id)
    }
  }
  const remaining = list.filter((t) => !used.has(t.id))
  remaining.sort((a, b) => (a.priority || 50) - (b.priority || 50))
  ordered.push(...remaining)
  return ordered
}