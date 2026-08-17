import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import 'dotenv/config';

import { config, loadFeeds } from './config.mjs';
import { fetchAllFeeds } from './lib/fetchFeeds.mjs';
import { extractArticleBody } from './lib/extractArticle.mjs';
import { buildDigestEpub } from './lib/buildEbook.mjs';
import { convertEbook } from './lib/convertEbook.mjs';
import { sendDigestMail } from './lib/sendMail.mjs';

async function enrichWithFullArticles(results) {
  if (!config.fetchFullArticles) return results;

  const limit = pLimit(config.articleConcurrency);
  await Promise.all(
    results.flatMap((result) =>
      result.items.map((item) =>
        limit(async () => {
          item.fullHtml = await extractArticleBody(item.link, config.articleTimeoutMs);
        }),
      ),
    ),
  );
  return results;
}

async function main() {
  console.log('Lade Feed-Konfiguration ...');
  const feeds = await loadFeeds();
  console.log(`${feeds.length} Feeds konfiguriert.`);

  console.log('Lade RSS-Feeds ...');
  const results = await fetchAllFeeds(feeds, {
    timeoutMs: config.feedTimeoutMs,
    maxItems: config.maxItemsPerFeed,
  });

  for (const r of results) {
    if (r.error) {
      console.warn(`  [FEHLER] ${r.name}: ${r.error}`);
    } else {
      console.log(`  [OK] ${r.name}: ${r.items.length} Artikel`);
    }
  }

  const usableResults = results.filter((r) => !r.error && r.items.length > 0);
  if (usableResults.length === 0) {
    throw new Error('Alle Feeds sind fehlgeschlagen oder leer – kein Digest erstellt.');
  }

  if (config.fetchFullArticles) {
    console.log('Lade Volltexte der Artikel ...');
    await enrichWithFullArticles(usableResults);
  }

  console.log('Erstelle EPUB ...');
  const now = new Date();
  const { buffer: epubBuffer, dateLabel } = await buildDigestEpub({ results, date: now, timezone: config.timezone });

  console.log(`Konvertiere nach ${config.outputFormat.toUpperCase()} ...`);
  const buffer = await convertEbook(epubBuffer, config.outputFormat);

  const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format(now);
  const filename = `Pressespiegel-${isoDate}.${config.outputFormat}`;

  if (config.dryRun) {
    await mkdir(config.outputDir, { recursive: true });
    const outPath = path.join(config.outputDir, filename);
    await writeFile(outPath, buffer);
    console.log(`DRY_RUN aktiv – Datei gespeichert unter ${outPath} (kein Mailversand).`);
    return;
  }

  console.log(`Sende ${config.outputFormat.toUpperCase()} an ${config.mail.to.join(', ')} ...`);
  await sendDigestMail({ mailConfig: config.mail, buffer, filename, dateLabel, format: config.outputFormat });
  console.log('Pressespiegel erfolgreich versendet.');
}

main().catch((err) => {
  console.error('Fehler beim Erstellen/Versenden des Pressespiegels:', err);
  process.exitCode = 1;
});
