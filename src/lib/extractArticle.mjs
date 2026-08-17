import { extract } from '@extractus/article-extractor';
import { sanitizeArticleHtml } from './sanitizeHtml.mjs';

const USER_AGENT =
  'Mozilla/5.0 (compatible; GreekNewsfeedKindleBot/1.0; +https://github.com/)';

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'br'];

// Fetches and reader-extracts the full article body for a link, so the
// digest contains readable offline text instead of just an RSS teaser.
// Returns null (never throws) if extraction fails for any reason.
export async function extractArticleBody(url, timeoutMs) {
  if (!url) return null;
  const fetcher = (u) =>
    fetch(u, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      signal: AbortSignal.timeout(timeoutMs),
    });

  try {
    const data = await extract(url, { allowedTags: ALLOWED_TAGS, contentLengthThreshold: 200 }, fetcher);
    if (!data || !data.content) return null;
    return sanitizeArticleHtml(data.content);
  } catch {
    return null;
  }
}
