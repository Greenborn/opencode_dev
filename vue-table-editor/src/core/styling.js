export function invertHexColor(h) {
  if (!h || h.length !== 7) return null
  return '#' + (255 - parseInt(h.slice(1, 3), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(3, 5), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(5, 7), 16)).toString(16).padStart(2, '0')
}

export function applyFieldDefCss(fieldsDef, styling) {
  if (!Array.isArray(fieldsDef)) return fieldsDef
  const fc = styling?.fieldClasses
  if (!fc) return fieldsDef
  for (const f of fieldsDef) {
    if (fc[f.field]) f.css = (f.css || '') + ' ' + fc[f.field]
  }
  return fieldsDef
}

export function applyRowStyling(row, styling) {
  if (!styling) return row
  row.__css_class = ''
  if (typeof styling.rowClassFn === 'function') row.__css_class = styling.rowClassFn(row)
  if (typeof styling.rowStyleFn === 'function') row.__style = styling.rowStyleFn(row)
  row.__field_styles = {}
  if (styling.fieldStyleFns) {
    for (const f of Object.keys(styling.fieldStyleFns)) {
      if (row[f] != null) row.__field_styles[f] = styling.fieldStyleFns[f](row[f])
    }
  }
  return row
}

export function unwrapCell(row, col) {
  if (row == null) return { value: null, style: null }
  const v = row[col?.field]
  if (v != null && typeof v === 'object' && '__style' in v) return { value: v.value, style: v.__style }
  if (row.__field_styles?.[col?.field]) return { value: v, style: row.__field_styles[col?.field] }
  return { value: v, style: null }
}

export function cellStyle(row, col) {
  return unwrapCell(row, col).style
}
