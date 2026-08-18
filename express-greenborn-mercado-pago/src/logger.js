/**
 * Logger por defecto. El host puede inyectar el suyo (console, pino, etc.)
 * respetando la interfaz `{ info, warn, error, debug, log? }`.
 */
export function defaultLogger() {
  const noop = () => {};
  return {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    log: noop,
  };
}

export function normalizeLogger(logger) {
  if (!logger) return defaultLogger();
  // Acepta console directamente, o un objeto con los métodos que use.
  const base = (typeof logger === 'function' || !logger.info)
    ? { info: logger, warn: logger, error: logger, debug: logger, log: logger }
    : logger;
  const fallback = defaultLogger();
  return {
    info: base.info || fallback.info,
    warn: base.warn || fallback.warn,
    error: base.error || fallback.error,
    debug: base.debug || fallback.debug,
    log: base.log || fallback.log || base.info || fallback.info,
  };
}