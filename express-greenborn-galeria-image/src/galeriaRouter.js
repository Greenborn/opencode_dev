import { Router } from 'express';
import multer from 'multer';
import { resolve } from 'node:path';

export function createGaleriaRouter({ service, config, logger, storage, middlewares = {} }) {
  const router = Router();

  const upload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await storage.ensureDirs();
          cb(null, resolve(config.uploadDir));
        } catch (err) {
          cb(err);
        }
      },
      filename: (req, file, cb) => {
        cb(null, storage.generateFilename(file.originalname, file.mimetype));
      },
    }),
    limits: { fileSize: config.maxFileSize },
    fileFilter: (req, file, cb) => {
      if (config.allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${config.allowedMimeTypes.join(', ')}`));
    },
  });

  const mw = {
    list: middlewares.list || [],
    read: middlewares.read || [],
    create: middlewares.create || [],
    update: middlewares.update || [],
    delete: middlewares.delete || [],
  };

  router.get('/', ...mw.list, async (req, res, next) => {
    try {
      res.json(await service.list(req.query || {}));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id(\\d+)', ...mw.read, async (req, res, next) => {
    try {
      const image = await service.getById(req.params.id);
      if (!image) return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      res.json({ success: true, data: image });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...mw.create, upload.single('imagen'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Campo 'imagen' requerido (multipart/form-data)" });
      }
      const meta = {
        titulo: req.body?.titulo,
        descripcion: req.body?.descripcion,
        seccion: req.body?.seccion,
        orden: req.body?.orden,
      };
      const image = await service.createFromFile(req.file, meta);
      res.status(201).json({ success: true, data: image });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id(\\d+)', ...mw.update, async (req, res, next) => {
    try {
      const image = await service.update(req.params.id, req.body || {});
      if (!image) return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      res.json({ success: true, data: image });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id(\\d+)', ...mw.delete, async (req, res, next) => {
    try {
      const removed = await service.remove(req.params.id);
      if (!removed) return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      res.json({ success: true, message: 'Imagen eliminada' });
    } catch (err) {
      next(err);
    }
  });

  // Servido de archivos (público por defecto para poder usarse en etiquetas <img>).
  router.get('/archivos/thumbnails/:filename', (req, res) => {
    res.sendFile(storage.thumbnailPath(req.params.filename));
  });

  router.get('/archivos/:filename', (req, res) => {
    res.sendFile(storage.uploadPath(req.params.filename));
  });

  // Middleware de errores de multer.
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || /Tipo de archivo no permitido/.test(err.message || '')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  });

  return router;
}

export default createGaleriaRouter;
