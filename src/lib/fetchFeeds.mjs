import Parser from 'rss-parser';

const USER_AGENT =
  'Mozilla/5.0 (compatible; GreekNewsfeedKindleBot/1.0; +https://github.com/)';

function makeParser(timeoutMs) {
  return new Parser({
    timeout: timeoutMs,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  });
}

async function fetchFeed(feed, { timeoutMs, maxItems }) {
  const parser = makeParser(timeoutMs);
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, maxItems).map((item) => ({
      title: (item.title || '(ohne Titel)').trim(),
      link: item.link || item.guid || '',
      publishedAt: item.isoDate || item.pubDate || null,
      summary: item.contentSnippet || item.summary || '',
    }));
    return { ...feed, items, error: null };
  } catch (err) {
    return { ...feed, items: [], error: err.message || String(err) };
  }
}

export async function fetchAllFeeds(feeds, options) {
  return Promise.all(feeds.map((feed) => fetchFeed(feed, options)));
}
