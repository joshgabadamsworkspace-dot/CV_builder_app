import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = resolve(projectRoot, 'server/data/portfolio.db');
const outputPath = resolve(projectRoot, 'src/data/publishedPortfolio.json');
const assetDirectory = resolve(projectRoot, 'public/portfolio-assets');

const database = new DatabaseSync(databasePath, { readOnly: true });
const row = database.prepare(`
  SELECT data_json
  FROM profiles
  WHERE published = 1
  ORDER BY updated_at DESC
  LIMIT 1
`).get();
database.close();

if (!row) throw new Error('No published profile exists in the local database.');

const profile = JSON.parse(row.data_json);
rmSync(assetDirectory, { recursive: true, force: true });
mkdirSync(assetDirectory, { recursive: true });

const extensions = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

function safeName(parts) {
  return parts
    .map((part) => String(part).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase())
    .filter(Boolean)
    .join('-');
}

function extractImages(value, path = []) {
  if (typeof value === 'string') {
    const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/s);
    if (!match) return value;
    const extension = extensions[match[1]];
    if (!extension) throw new Error(`Unsupported embedded image type: ${match[1]}`);
    const base = safeName(path) || 'image';
    const sourceName = `${base}.${extension}`;
    const sourcePath = resolve(assetDirectory, sourceName);
    writeFileSync(sourcePath, Buffer.from(match[2], 'base64'));

    // Use cache-friendly WebP files when cwebp is available. Project captures
    // are displayed as cards, so 1600px is ample while avoiding 2–3K uploads.
    const webpName = `${base}.webp`;
    const webpPath = resolve(assetDirectory, webpName);
    const resize = path[0] === 'projects' ? ['-resize', '1600', '0'] : [];
    const conversion = spawnSync('cwebp', ['-quiet', '-q', '84', '-m', '6', ...resize, sourcePath, '-o', webpPath]);
    if (conversion.status === 0) {
      unlinkSync(sourcePath);
      return `/portfolio-assets/${webpName}`;
    }

    return `/portfolio-assets/${sourceName}`;
  }
  if (Array.isArray(value)) return value.map((item, index) => extractImages(item, [...path, index]));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, extractImages(item, [...path, key])]));
  }
  return value;
}

const exportedProfile = extractImages(profile);
writeFileSync(outputPath, `${JSON.stringify(exportedProfile, null, 2)}\n`);

const imageCount = JSON.stringify(profile).match(/data:image\//g)?.length ?? 0;
console.log(`Exported ${profile.profileName} with ${imageCount} static images.`);
console.log(`Profile: ${outputPath}`);
console.log(`Assets:  ${assetDirectory}`);
