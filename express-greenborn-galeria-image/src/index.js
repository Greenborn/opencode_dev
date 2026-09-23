import { resolveConfig } from './config.js';
import { normalizeLogger } from './logger.js';
import { createDiskStorage } from './storage/diskStorage.js';
import { createGaleriaService } from './galeriaService.js';
import { createGaleriaRouter } from './galeriaRouter.js';

export function createGaleriaImage(options = {}) {
  const { knex, middlewares } = options;
  if (!knex) throw new Error('createGaleriaImage requiere options.knex (instancia de Knex)');
  const logger = normalizeLogger(options.logger);
  const config = resolveConfig(options);
  const storage = createDiskStorage({ config, logger });
  const service = createGaleriaService({ knex, config, logger, storage });
  const galeriaRouter = createGaleriaRouter({ service, config, logger, storage, middlewares });

  return {
    galeriaRouter,
    config,
    rootPath: config.rootPath,
    list: (query) => service.list(query),
    getById: (id) => service.getById(id),
    createFromFile: (file, meta) => service.createFromFile(file, meta),
    update: (id, changes) => service.update(id, changes),
    remove: (id) => service.remove(id),
  };
}

export { resolveConfig, sanitizeFilename, buildFileUrl } from './config.js';
export { normalizeLogger } from './logger.js';
export { createDiskStorage } from './storage/diskStorage.js';
export { createGaleriaService } from './galeriaService.js';
export { createGaleriaRouter } from './galeriaRouter.js';
export default createGaleriaImage;
