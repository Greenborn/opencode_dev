export function normalizeLogger(logger) {
  if (!logger) {
    const noop = () => {};
    return { info: noop, warn: noop, error: noop, debug: noop, log: noop };
  }
  if (typeof logger === 'function') {
    return { info: logger, warn: logger, error: logger, debug: logger, log: logger };
  }
  if (typeof logger === 'object') {
    return {
      info: typeof logger.info === 'function' ? logger.info : (typeof logger.log === 'function' ? logger.log : () => {}),
      warn: typeof logger.warn === 'function' ? logger.warn : () => {},
      error: typeof logger.error === 'function' ? logger.error : () => {},
      debug: typeof logger.debug === 'function' ? logger.debug : () => {},
      log: typeof logger.log === 'function' ? logger.log : () => {},
    };
  }
  const noop = () => {};
  return { info: noop, warn: noop, error: noop, debug: noop, log: noop };
}

export default normalizeLogger;
