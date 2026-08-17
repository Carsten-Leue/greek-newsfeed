import { readFile } from 'node:fs/promises';
import path from 'node:path';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const VALID_FORMATS = new Set(['azw3', 'mobi']);
const requestedFormat = (process.env.OUTPUT_FORMAT || 'azw3').toLowerCase();

export const config = {
  timezone: process.env.TIMEZONE || 'Europe/Athens',
  outputFormat: VALID_FORMATS.has(requestedFormat) ? requestedFormat : 'azw3',
  feedsFile: process.env.FEEDS_FILE || path.join(process.cwd(), 'config', 'feeds.json'),
  maxItemsPerFeed: int(process.env.MAX_ITEMS_PER_FEED, 8),
  feedTimeoutMs: int(process.env.FEED_TIMEOUT_MS, 15000),
  fetchFullArticles: bool(process.env.FETCH_FULL_ARTICLES, true),
  articleTimeoutMs: int(process.env.ARTICLE_TIMEOUT_MS, 10000),
  articleConcurrency: int(process.env.ARTICLE_CONCURRENCY, 4),
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'output'),
  dryRun: bool(process.env.DRY_RUN, false),
  mail: {
    host: process.env.SMTP_HOST,
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: (process.env.KINDLE_EMAIL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};

export async function loadFeeds() {
  const raw = await readFile(config.feedsFile, 'utf8');
  const feeds = JSON.parse(raw);
  if (!Array.isArray(feeds) || feeds.length === 0) {
    throw new Error(`Keine Feeds in ${config.feedsFile} gefunden`);
  }
  return feeds;
}
