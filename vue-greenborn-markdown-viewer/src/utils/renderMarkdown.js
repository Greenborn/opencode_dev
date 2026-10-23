import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Convierte Markdown (GFM) a HTML y lo sanitiza con DOMPurify.
// El HTML crudo incluido en el Markdown también pasa por la sanitización.
export function renderMarkdown(texto) {
  const html = marked.parse(String(texto ?? ''), { gfm: true, async: false });
  return DOMPurify.sanitize(html);
}
