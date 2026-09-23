import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createDiskStorage({ config, logger }) {
  const uploadDir = resolve(config.uploadDir);
  const thumbnailsDir = join(uploadDir, 'thumbnails');

  async function ensureDirs() {
    await mkdir(thumbnailsDir, { recursive: true });
  }

  function uploadPath(filename) {
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
    return join(uploadDir, safe);
  }

  function thumbnailPath(filename) {
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
    return join(thumbnailsDir, safe);
  }

  async function saveBuffer(filename, buffer) {
    await ensureDirs();
    await writeFile(uploadPath(filename), buffer);
    return uploadPath(filename);
  }

  async function saveThumbnail(filename, buffer) {
    await ensureDirs();
    await writeFile(thumbnailPath(filename), buffer);
    return thumbnailPath(filename);
  }

  async function removeFiles(filenames) {
    await Promise.all(
      filenames.flatMap((f) => [
        unlink(uploadPath(f)).catch(() => {}),
        unlink(thumbnailPath(f)).catch(() => {}),
      ]),
    );
  }

  function generateFilename(originalname, mimetype) {
    const extFromName = String(originalname ?? '').includes('.')
      ? `.${String(originalname).split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : '';
    const ext = extFromName || extensionFromMime(mimetype) || '.bin';
    return `${Date.now()}-${randomUUID()}${ext}`;
  }

  return { uploadPath, thumbnailPath, saveBuffer, saveThumbnail, removeFiles, generateFilename, ensureDirs };
}

function extensionFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
  };
  return map[mime] || null;
}

export default createDiskStorage;
