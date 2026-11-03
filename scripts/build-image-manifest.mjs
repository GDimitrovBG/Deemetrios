// =============================================================================
//  build-image-manifest.mjs
//  Rebuilds public/image-variants.json from the responsive variants that
//  already exist in the uploads folder. Runs as the first step of
//  `npm run build`. Read-only on the images; no sharp needed; takes seconds.
//
//  WHY
//  The manifest used to be committed to Git. The server generates it (see
//  optimize-images.mjs --variants), so the server's copy always differed from
//  the committed `{}` — and every `git pull` (or the `git checkout --` that a
//  blocked pull pushes you into) reset it to `{}`. Measured 2026-11-03: the
//  live manifest was `{}` while every -480w/-960w file was sitting on disk, so
//  no page had a srcset and phones downloaded 1.5–2.4 MB of oversized photos
//  per page. The file is now untracked and rebuilt here on every build.
//
//  USAGE
//      UPLOADS_DIR=/path/to/wp-content/uploads npm run build
//  or  node scripts/build-image-manifest.mjs /path/to/wp-content/uploads
//
//  Without a folder (local dev, CI) it keeps an existing manifest untouched
//  and only creates an empty `{}` when none exists, so the import never fails.
// =============================================================================

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public', 'image-variants.json');
const VARIANT = /^(.*)-(480|960|1440)w\.webp$/i;

const dir = process.argv[2] || process.env.UPLOADS_DIR || '';

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function walk(d, out) {
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (VARIANT.test(e.name)) out.push(full);
  }
}

if (!dir) {
  if (await exists(MANIFEST)) {
    const n = Object.keys(JSON.parse(await fs.readFile(MANIFEST, 'utf8') || '{}')).length;
    console.log(`[images] no UPLOADS_DIR — keeping existing manifest (${n} images with srcset)`);
    if (!n) console.warn('[images] ⚠ manifest is empty: pages will ship WITHOUT srcset. Set UPLOADS_DIR on the server.');
  } else {
    await fs.writeFile(MANIFEST, '{}\n', 'utf8');
    console.warn('[images] ⚠ no UPLOADS_DIR and no manifest — wrote {} (no srcset). Set UPLOADS_DIR on the server.');
  }
  process.exit(0);
}

if (!(await exists(dir))) {
  console.error(`[images] ✗ UPLOADS_DIR does not exist: ${dir}`);
  process.exit(1);
}

const files = [];
await walk(dir, files);

const manifest = {};
for (const f of files) {
  const [, stem, w] = path.basename(f).match(VARIANT);
  const original = path.join(path.dirname(f), `${stem}.webp`);
  // Only list a variant when the full-size twin it belongs to exists — srcsetFor()
  // always appends the original at its own width.
  if (!(await exists(original))) continue;
  const rel = path.relative(dir, original).split(path.sep).join('/');
  const key = `/wp-content/uploads/${rel}`;
  (manifest[key] ||= []).push(Number(w));
}
for (const k of Object.keys(manifest)) manifest[k] = [...new Set(manifest[k])].sort((a, b) => a - b);

const sorted = Object.fromEntries(Object.keys(manifest).sort().map(k => [k, manifest[k]]));
await fs.writeFile(MANIFEST, JSON.stringify(sorted) + '\n', 'utf8');
console.log(`[images] manifest: ${Object.keys(sorted).length} images with srcset (from ${files.length} variant files)`);
