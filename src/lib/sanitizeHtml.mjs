import * as cheerio from 'cheerio';

const REMOVE_TAGS = ['img', 'picture', 'figure', 'figcaption', 'iframe', 'script', 'style', 'svg', 'video', 'audio', 'source', 'noscript'];
const KEEP_ATTRS = new Set(['href']);

// Strips images, scripts and styling cruft from extracted article HTML so the
// resulting EPUB stays small and renders cleanly on an e-ink screen.
export function sanitizeArticleHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html, null, false);

  $(REMOVE_TAGS.join(',')).remove();

  $('*').each((_, el) => {
    if (el.type !== 'tag') return;
    for (const attr of Object.keys(el.attribs || {})) {
      if (!KEEP_ATTRS.has(attr)) delete el.attribs[attr];
    }
  });

  const out = $.root().html() || '';
  return out.trim();
}
