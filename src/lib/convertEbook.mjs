import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Converts the EPUB buffer to a Kindle-native format (azw3 or mobi) using
// Calibre's "ebook-convert" CLI, since Node has no library that writes the
// proprietary Mobipocket/KF8 containers directly.
export async function convertEbook(epubBuffer, format) {
  const dir = await mkdtemp(path.join(tmpdir(), 'greek-newsfeed-'));
  const sourcePath = path.join(dir, 'digest.epub');
  const targetPath = path.join(dir, `digest.${format}`);

  try {
    await writeFile(sourcePath, epubBuffer);
    await execFileAsync('ebook-convert', [sourcePath, targetPath], {
      env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
      timeout: 120000,
    });
    return await readFile(targetPath);
  } catch (err) {
    throw new Error(
      `ebook-convert fehlgeschlagen (ist Calibre installiert?): ${err.stderr || err.message}`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const CONTENT_TYPES = {
  azw3: 'application/vnd.amazon.ebook',
  mobi: 'application/x-mobipocket-ebook',
};
