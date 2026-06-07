#!/usr/bin/env node
/**
 * One-time image optimiser — shrinks oversized photos in place.
 *
 * The dress photos are ~1707×2560 / ~383KB but display in small cards. This
 * resizes anything wider than MAX_WIDTH down to MAX_WIDTH and recompresses,
 * typically cutting each file 60–75%. URLs stay identical, so no code or DB
 * changes — the same /wp-content/... paths just serve lighter images.
 *
 * SAFE: writes to a temp file then atomically renames; skips files that
 * wouldn't get smaller. ALWAYS back up first (see run steps below).
 *
 * RUN (on the server, against the real uploads folder):
 *   cd <site root>
 *   npm i sharp                       # one-time, ~30s
 *   # BACK UP FIRST:
 *   tar czf ~/uploads-backup.tar.gz -C /path/to wp-content/uploads
 *   node scripts/optimize-images.mjs /path/to/wp-content/uploads
 *
 * Flags:
 *   --dry        report what would change, write nothing
 *   --width=NNN  max width (default 1600)
 *   --quality=NN JPEG/WebP quality (default 82)
 */
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
const DRY = args.includes('--dry');
const MAX_WIDTH = Number((args.find(a => a.startsWith('--width=')) || '').split('=')[1]) || 1600;
const QUALITY   = Number((args.find(a => a.startsWith('--quality=')) || '').split('=')[1]) || 82;

if (!dir) {
  console.error('Usage: node optimize-images.mjs <folder> [--dry] [--width=1600] [--quality=82]');
  process.exit(1);
}

const EXT = /\.(jpe?g|png)$/i;
let scanned = 0, changed = 0, beforeBytes = 0, afterBytes = 0, skipped = 0, errors = 0;

async function walk(d) {
  for (const entry of await fs.readdir(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (EXT.test(entry.name)) await optimize(full);
  }
}

async function optimize(file) {
  scanned++;
  try {
    const before = (await fs.stat(file)).size;
    const img = sharp(file, { failOn: 'none' });
    const meta = await img.metadata();
    const isJpeg = /jpe?g/i.test(meta.format || '');
    const tooWide = meta.width && meta.width > MAX_WIDTH;

    // Build pipeline: resize if wide, always recompress.
    let pipe = sharp(file, { failOn: 'none' }).rotate(); // honour EXIF orientation
    if (tooWide) pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    pipe = isJpeg
      ? pipe.jpeg({ quality: QUALITY, mozjpeg: true })
      : pipe.png({ quality: QUALITY, compressionLevel: 9 });

    const buf = await pipe.toBuffer();

    // Only keep it if we actually saved something meaningful (>3%).
    if (buf.length >= before * 0.97) { skipped++; return; }

    beforeBytes += before; afterBytes += buf.length; changed++;
    const pct = Math.round((1 - buf.length / before) * 100);
    console.log(`  ${tooWide ? 'resize+' : ''}recompress  -${pct}%  ${kb(before)}→${kb(buf.length)}  ${path.basename(file)}`);

    if (!DRY) {
      const tmp = file + '.tmp';
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, file);
    }
  } catch (e) {
    errors++;
    console.error(`  ! error: ${path.basename(file)} — ${e.message}`);
  }
}

const kb = b => (b / 1024).toFixed(0) + 'KB';

console.log(`\nOptimising images in: ${dir}`);
console.log(`Max width: ${MAX_WIDTH}px · quality: ${QUALITY}${DRY ? ' · DRY RUN (no writes)' : ''}\n`);

await walk(dir);

console.log('\n──────────────────────────────────────────');
console.log(`Scanned:  ${scanned}`);
console.log(`Optimised:${changed}   Skipped: ${skipped}   Errors: ${errors}`);
if (changed) {
  console.log(`Total:    ${kb(beforeBytes)} → ${kb(afterBytes)}  (saved ${Math.round((1 - afterBytes / beforeBytes) * 100)}%, ${kb(beforeBytes - afterBytes)})`);
}
console.log('──────────────────────────────────────────\n');
