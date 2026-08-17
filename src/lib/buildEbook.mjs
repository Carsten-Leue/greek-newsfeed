import { EPub } from 'epub-gen-memory';

const CSS = `
body { font-family: "Bookerly", Georgia, serif; line-height: 1.45; margin: 0 1.2em; }
h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; line-height: 1.2; }
h1 { font-size: 1.4em; margin-top: 0.2em; }
h2 { font-size: 1.2em; border-bottom: 1px solid #999; padding-bottom: 0.2em; }
h3 { font-size: 1.05em; margin-bottom: 0.1em; }
p { margin: 0.5em 0; text-align: left; }
p.meta { font-size: 0.75em; color: #555; font-style: italic; margin: 0 0 0.4em 0; }
p.source-link { font-size: 0.7em; color: #555; word-break: break-all; margin: 0.2em 0 1.2em 0; }
p.summary { font-style: italic; }
hr { border: none; border-top: 1px solid #ccc; margin: 1.2em 0; }
ul, ol { margin: 0.5em 0; padding-left: 1.4em; }
.feed-error { color: #900; font-size: 0.85em; }
`;

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatPublished(isoOrRfc, timezone) {
  if (!isoOrRfc) return '';
  const d = new Date(isoOrRfc);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function renderArticle(item, sourceName, timezone) {
  const time = formatPublished(item.publishedAt, timezone);
  const meta = [sourceName, time].filter(Boolean).join(' • ');
  const body = item.fullHtml
    ? item.fullHtml
    : `<p class="summary">${escapeHtml(item.summary)}</p>`;
  return `
    <h3>${escapeHtml(item.title)}</h3>
    <p class="meta">${escapeHtml(meta)}</p>
    ${body}
    <p class="source-link">Quelle: ${escapeHtml(item.link)}</p>
    <hr/>
  `;
}

function renderIntroChapter(dateLabel, results, timezone) {
  const ok = results.filter((r) => !r.error && r.items.length > 0);
  const failed = results.filter((r) => r.error);
  const empty = results.filter((r) => !r.error && r.items.length === 0);

  const okList = ok.map((r) => `<li>${escapeHtml(r.name)} (${r.items.length} Artikel)</li>`).join('');
  const failList = failed
    .map((r) => `<li class="feed-error">${escapeHtml(r.name)} – Fehler: ${escapeHtml(r.error)}</li>`)
    .join('');
  const emptyList = empty
    .map((r) => `<li class="feed-error">${escapeHtml(r.name)} – keine Artikel gefunden</li>`)
    .join('');

  return `
    <p>Erstellt am ${escapeHtml(dateLabel)}.</p>
    <p>Enthaltene Quellen:</p>
    <ul>${okList}</ul>
    ${failed.length || empty.length ? `<p>Nicht verfügbare Quellen:</p><ul>${failList}${emptyList}</ul>` : ''}
  `;
}

// Assembles the fetched/enriched feed results into an EPUB buffer, one
// chapter per news source plus a summary chapter listing any feeds that
// failed so problems are visible on the Kindle itself, not just in logs.
export async function buildDigestEpub({ results, date, timezone }) {
  const dateLabel = new Intl.DateTimeFormat('de-DE', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const title = `Griechischer Pressespiegel – ${dateLabel}`;

  const chapters = [
    {
      title: 'Übersicht',
      content: renderIntroChapter(dateLabel, results, timezone),
      beforeToc: true,
      excludeFromToc: false,
    },
  ];

  for (const result of results) {
    if (result.error || result.items.length === 0) continue;
    const content = result.items.map((item) => renderArticle(item, result.name, timezone)).join('\n');
    chapters.push({ title: result.name, content });
  }

  const buffer = await new EPub(
    {
      title,
      author: 'Greek Newsfeed Kindle Digest',
      publisher: 'Greek Newsfeed Kindle Digest',
      description: `Automatisch erstellter Pressespiegel griechischer Nachrichtenseiten vom ${dateLabel}.`,
      date: date.toISOString(),
      lang: 'el',
      tocTitle: 'Inhalt',
      css: CSS,
      ignoreFailedDownloads: true,
      verbose: false,
    },
    chapters,
  ).genEpub();

  return { buffer, title, dateLabel };
}
