/**
 * Normaliza un item de imagen a un modelo interno común. Acepta el modelo
 * ImageDetailItem del paquete angular-greenborn-image-detail (url, title,
 * caption, section, metadata: [{label, value}]) y el modelo devuelto por
 * express-greenborn-galeria-image (url, thumbnail_url, titulo, descripcion,
 * seccion, width/height/size/mime_type).
 */
export function normalizeImagen(item) {
  if (!item) return null;
  const metadata = Array.isArray(item.metadata)
    ? item.metadata
    : buildMetadata(item);
  return {
    url: item.url ?? item.src ?? '',
    thumbnailUrl: item.thumbnailUrl ?? item.thumbnail_url ?? item.url ?? item.src ?? '',
    titulo: item.titulo ?? item.title ?? '',
    descripcion: item.descripcion ?? item.caption ?? '',
    seccion: item.seccion ?? item.section ?? '',
    metadata,
    raw: item,
  };
}

function buildMetadata(item) {
  const pares = [];
  if (item.original_name) pares.push({ label: 'Archivo', value: item.original_name });
  if (item.mime_type) pares.push({ label: 'Tipo', value: item.mime_type });
  if (item.width && item.height) pares.push({ label: 'Dimensiones', value: `${item.width} × ${item.height} px` });
  if (item.size) pares.push({ label: 'Peso', value: formatSize(item.size) });
  if (item.created_at) pares.push({ label: 'Creada', value: String(item.created_at) });
  return pares;
}

export function formatSize(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export default normalizeImagen;
