import { applyRowStyling } from './styling.js'

export function getCamposJson(fields_def) {
  if (!fields_def || !Array.isArray(fields_def)) return {}
  const result = {}
  for (const fd of fields_def) {
    if (fd.isJson) result[fd.field] = fd
  }
  return result
}

export function mapFilaJSONtabla(row, camposJson) {
  if (!row || !camposJson) return row
  for (const [field] of Object.entries(camposJson)) {
    const val = row[field]
    if (typeof val === 'string') {
      try {
        row[field] = JSON.parse(val)
      } catch {
        row[field] = val
      }
    }
  }
  return row
}

export function getCamposJSONyFieldDef(fields_def, camposJson, row) {
  if (!fields_def || !Array.isArray(fields_def)) return fields_def
  if (!camposJson || !row) return fields_def
  for (const [field] of Object.entries(camposJson)) {
    const val = row[field]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [sub, subVal] of Object.entries(val)) {
        if (typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal)) continue
        fields_def.push({
          field: `${field}.${sub}`,
          headerName: sub,
          sortable: false,
          filterable: false,
        })
      }
    }
  }
  return fields_def
}

export function rowFormatter(row, fields_def) {
  if (!row || !fields_def) return row
  for (const fd of fields_def) {
    if (fd.formatter && typeof fd.formatter === 'function') {
      row[fd.field] = fd.formatter(row[fd.field], row)
    }
  }
  return row
}

export const row_formatter = rowFormatter

export function getProcessFieldDef(fields_def) {
  if (!fields_def || !Array.isArray(fields_def)) return []
  return fields_def.map(fd => ({
    field: fd.field,
    headerName: fd.headerName || fd.field,
    sortable: fd.sortable !== false,
    filterable: fd.filterable !== false,
    css: fd.css || '',
    form_type: fd.form_type || null,
    type: fd.type || 'text',
    editable: fd.editable || false,
  }))
}

export function reOrder(cols, order) {
  if (!order || !order.length) return cols
  const ordered = []
  for (const f of order) {
    const found = cols.find(c => c.field === f)
    if (found) ordered.push(found)
  }
  for (const c of cols) {
    if (!ordered.some(x => x.field === c.field)) ordered.push(c)
  }
  return ordered
}

export function getFieldDefFFormated(fields_def) {
  if (!fields_def || !Array.isArray(fields_def)) return fields_def
  return fields_def.map(fd => ({
    ...fd,
    headerName: fd.headerName || fd.field,
  }))
}

export function greenbornDataPipeline(styling = null) {
  return {
    processRows(rows, fields_def) {
      if (!rows?.length) return rows
      const cj = getCamposJson(fields_def)
      for (let i = 0; i < rows.length; i++) {
        let r = mapFilaJSONtabla(rows[i], cj)
        r = rowFormatter(r, fields_def)
        rows[i] = applyRowStyling(r, styling)
      }
      return rows
    },
    processFields(fields_def, firstRow) {
      if (!fields_def || !Array.isArray(fields_def)) return fields_def
      let fd = fields_def
      if (firstRow) {
        fd = getCamposJSONyFieldDef([...fd], getCamposJson(fd), firstRow)
      }
      return getFieldDefFFormated(fd)
    },
    processColumns(columns) {
      return getProcessFieldDef(columns)
    },
  }
}
