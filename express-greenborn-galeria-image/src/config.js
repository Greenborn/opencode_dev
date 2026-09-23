export const DEFAULTS = {
  uploadDir: 'uploads/galeria',
  publicBaseUrl: '',
  archivosPath: '/api/galeria-imagenes/archivos',
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'],
  thumbnailWidth: 400,
  defaultLimit: 24,
  maxLimit: 100,
  rootPath: '/api/galeria-imagenes',
  tabla: 'galeria_imagenes',
};

export function resolveConfig(options = {}, env = process.env) {
  const opt = { ...options };
  const boolish = (v, dflt) => (v === undefined || v === null ? dflt : v);
  return {
    uploadDir: opt.uploadDir ?? env.GALERIA_UPLOAD_DIR ?? DEFAULTS.uploadDir,
    publicBaseUrl: (opt.publicBaseUrl ?? env.GALERIA_PUBLIC_BASE_URL ?? DEFAULTS.publicBaseUrl).replace(/\/+$/, ''),
    archivosPath: (opt.archivosPath ?? env.GALERIA_ARCHIVOS_PATH ?? DEFAULTS.archivosPath).replace(/\/+$/, ''),
    maxFileSize: Number(opt.maxFileSize ?? env.GALERIA_MAX_FILE_SIZE ?? DEFAULTS.maxFileSize),
    allowedMimeTypes: opt.allowedMimeTypes ?? DEFAULTS.allowedMimeTypes,
    thumbnailWidth: Number(opt.thumbnailWidth ?? env.GALERIA_THUMBNAIL_WIDTH ?? DEFAULTS.thumbnailWidth),
    defaultLimit: Number(opt.defaultLimit ?? env.GALERIA_DEFAULT_LIMIT ?? DEFAULTS.defaultLimit),
    maxLimit: Number(opt.maxLimit ?? env.GALERIA_MAX_LIMIT ?? DEFAULTS.maxLimit),
    rootPath: (opt.rootPath ?? DEFAULTS.rootPath).replace(/\/+$/, ''),
    tabla: opt.tabla ?? DEFAULTS.tabla,
  };
}

export function sanitizeFilename(name) {
  const base = String(name ?? '')
    .split(/[\\/]/)
    .pop() || 'imagen';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/-+(\.[a-z0-9]+)?$/i, '$1')
    .toLowerCase();
  return cleaned || 'imagen';
}

export function buildFileUrl(config, filename, thumbnail = false) {
  const safe = sanitizeFilename(filename);
  if (thumbnail) {
    return `${config.publicBaseUrl}${config.archivosPath}/thumbnails/${safe}`;
  }
  return `${config.publicBaseUrl}${config.archivosPath}/${safe}`;
}

export default resolveConfig;
