/**
 * Clase helper para configuración de botones (toolbar y rowActions).
 * Encapsula label/visibilidad/disabled dinámicos y su manejador onClick.
 */
export class BtnConfig {
  constructor(cfg = {}) {
    this.key = cfg.key || ''
    this.icon = cfg.icon
    this.severity = cfg.severity || 'primary'
    this.class = cfg.class || ''
    this.label = cfg.label || ''
    this._getLabel = cfg.getLabel || (() => cfg.label || '')
    this._isVisible = cfg.isVisible || (() => true)
    this._isDisabled = cfg.isDisabled || (() => false)
    this.onClick = cfg.onClick || (() => {})
    this.helpKey = cfg.helpKey || null
    this.permissions = cfg.permissions || null
  }

  getLabel() {
    return this._getLabel()
  }

  isVisible() {
    return this._isVisible()
  }

  isDisabled() {
    return this._isDisabled()
  }
}

/**
 * Normaliza una config de botón (plano u objeto) a una instancia de BtnConfig.
 */
export function toBtnConfig(btn) {
  return btn instanceof BtnConfig ? btn : new BtnConfig(btn)
}
