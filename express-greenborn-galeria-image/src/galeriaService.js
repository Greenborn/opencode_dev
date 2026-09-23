import sharp from 'sharp';
import { buildFileUrl, sanitizeFilename } from './config.js';

export function createGaleriaService({ knex, config, logger, storage }) {
  const tabla = config.tabla;

  function toImage(row) {
    if (!row) return null;
    return {
      ...row,
      url: buildFileUrl(config, row.filename, false),
      thumbnail_url: row.thumbnail_filename
        ? buildFileUrl(config, row.thumbnail_filename, true)
        : buildFileUrl(config, row.filename, false),
    };
  }

  async function list(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(config.maxLimit, Math.max(1, Number(query.limit) || config.defaultLimit));
    const filtered = knex(tabla);
    if (query.seccion) filtered.where('seccion', String(query.seccion));
    if (query.q) {
      const term = `%${String(query.q)}%`;
      filtered.where((b) => b.where('titulo', 'like', term).orWhere('descripcion', 'like', term));
    }
    const [{ total }] = await filtered.clone().count({ total: '*' });
    const rows = await filtered
      .clone()
      .orderBy('orden', 'asc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    const totalNum = Number(total || 0);
    return {
      success: true,
      data: rows.map(toImage),
      total: totalNum,
      page,
      limit,
      pages: Math.max(1, Math.ceil(totalNum / limit)),
    };
  }

  async function getById(id) {
    const [row] = await knex(tabla).where('id', Number(id)).first();
    return toImage(row || null);
  }

  async function processImage(file) {
    const metadata = { width: null, height: null };
    let thumbnailBuffer = null;
    if (file.mimetype !== 'image/svg+xml') {
      try {
        const meta = await sharp(file.path).metadata();
        metadata.width = meta.width ?? null;
        metadata.height = meta.height ?? null;
        thumbnailBuffer = await sharp(file.path)
          .rotate()
          .resize({ width: config.thumbnailWidth, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (err) {
        logger.warn(`[galeria-image] no se pudo procesar la imagen ${file.originalname}: ${err.message}`);
      }
    }
    return { metadata, thumbnailBuffer };
  }

  async function createFromFile(file, meta = {}) {
    const { metadata, thumbnailBuffer } = await processImage(file);
    let thumbnailFilename = null;
    if (thumbnailBuffer) {
      thumbnailFilename = `${file.filename}.jpg`;
      await storage.saveThumbnail(thumbnailFilename, thumbnailBuffer);
    }
    const [id] = await knex(tabla).insert({
      titulo: meta.titulo ?? null,
      descripcion: meta.descripcion ?? null,
      seccion: meta.seccion ? sanitizeFilename(meta.seccion) : null,
      filename: file.filename,
      original_name: file.originalname ?? null,
      thumbnail_filename: thumbnailFilename,
      mime_type: file.mimetype,
      size: file.size ?? null,
      width: metadata.width,
      height: metadata.height,
      orden: Number.isFinite(Number(meta.orden)) ? Number(meta.orden) : 0,
    });
    logger.info(`[galeria-image] imagen creada id=${id} filename=${file.filename}`);
    return getById(id);
  }

  async function update(id, changes) {
    const allowed = {};
    if ('titulo' in changes) allowed.titulo = changes.titulo ?? null;
    if ('descripcion' in changes) allowed.descripcion = changes.descripcion ?? null;
    if ('seccion' in changes) allowed.seccion = changes.seccion ? sanitizeFilename(changes.seccion) : null;
    if ('orden' in changes) allowed.orden = Number(changes.orden) || 0;
    if (Object.keys(allowed).length === 0) return getById(id);
    await knex(tabla).where('id', Number(id)).update(allowed);
    return getById(id);
  }

  async function remove(id) {
    const [row] = await knex(tabla).where('id', Number(id)).first();
    if (!row) return false;
    await knex(tabla).where('id', Number(id)).del();
    await storage.removeFiles([row.filename, row.thumbnail_filename].filter(Boolean));
    logger.info(`[galeria-image] imagen eliminada id=${id}`);
    return true;
  }

  return { list, getById, createFromFile, update, remove, toImage };
}

export default createGaleriaService;
