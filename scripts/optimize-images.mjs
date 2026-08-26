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
 * RESPONSIVE VARIANTS (--variants)
 *
 *   The single biggest thing left on this site's Core Web Vitals is that one
 *   file size serves every slot. The home hero is 1600x2400 / 155 KB, and the
 *   same file is what a 2-column phone grid pulls into a 180 CSS-px card —
 *   roughly 4.4x more pixels than the screen can show, ~850 KB wasted on the
 *   first screen alone. There is no image CDN to resize on the fly, so the
 *   variants have to exist as files.
 *
 *   With --variants each image also gets `<name>-480w.webp`, `-960w.webp` and
 *   `-1440w.webp` next to it, and the list is written to
 *   public/image-variants.json. The app reads that manifest and only emits a
 *   srcset for images it actually lists, so a page can never point at a
 *   variant that was not generated.
 *
 *   Run it from the repo checkout on the server, so the manifest lands where
 *   the next `npm run build` will pick it up:
 *       node scripts/optimize-images.mjs /path/to/wp-content/uploads --variants
 *       npm run build
 *
 * Flags:
 *   --dry        report what would change, write nothing
 *   --width=NNN  max width for the original (default 1600)
 *   --quality=NN JPEG/WebP quality (default 82)
 *   --variants   also write -480w / -960w / -1440w twins + the manifest
 */
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
const DRY = args.includes('--dry');
const MAX_WIDTH = Number((args.find(a => a.startsWith('--width=')) || '').split('=')[1]) || 1600;
const QUALITY   = Number((args.find(a => a.startsWith('--quality=')) || '').split('=')[1]) || 82;
const VARIANTS = args.includes('--variants');

// Widths chosen from what the layout actually asks for:
//   480  — 2-up phone grid at DPR 2 (180 CSS px slot)
//   960  — 1-up phone / small tablet, and 4-up desktop cards
//  1440  — the product-page hero on a retina desktop
const VARIANT_WIDTHS = [480, 960, 1440];
const MANIFEST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'image-variants.json');
const manifest = {};   // "/wp-content/…/name.webp" -> [480, 960]
let variantsWritten = 0, variantBytes = 0;

if (!dir) {
  console.error('Usage: node optimize-images.mjs <folder> [--dry] [--width=1600] [--quality=82]');
  process.exit(1);
}

// WebP is included because the storefront serves the .webp twins on-page
// (see cdn.js) — those are the files that actually reach visitors, so they
// are the ones worth shrinking.
const EXT = /\.(jpe?g|png|webp)$/i;
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
    const fmt = (meta.format || '').toLowerCase();
    const isJpeg = /jpe?g/.test(fmt);
    const isWebp = fmt === 'webp';
    const tooWide = meta.width && meta.width > MAX_WIDTH;

    // Build pipeline: resize if wide, always recompress. Output format always
    // matches the input so file extensions/URLs stay identical.
    let pipe = sharp(file, { failOn: 'none' }).rotate(); // honour EXIF orientation
    if (tooWide) pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    pipe = isJpeg ? pipe.jpeg({ quality: QUALITY, mozjpeg: true })
         : isWebp ? pipe.webp({ quality: QUALITY })
         :          pipe.png({ quality: QUALITY, compressionLevel: 9 });

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

    if (VARIANTS) await writeVariants(file, buf, meta.width || 0);
  } catch (e) {
    errors++;
    console.error(`  ! error: ${path.basename(file)} — ${e.message}`);
  }
}


/**
 * Write the smaller twins for one image and record them in the manifest.
 *
 * Only widths genuinely narrower than the source are produced — upscaling
 * would be bytes spent to lose quality. A width whose file we do not write is
 * never listed, which is what keeps the srcset in the app honest.
 */
async function writeVariants(file, sourceBuf, sourceWidth) {
  const ext = path.extname(file);
  const stem = file.slice(0, -ext.length);
  const rel = '/' + path.relative(dir, file).split(path.sep).join('/');
  const key = ('/wp-content/uploads' + rel).replace(/\/+/g, '/');
  const made = [];

  for (const w of VARIANT_WIDTHS) {
    if (sourceWidth && w >= sourceWidth) continue;   // never upscale
    const out = `${stem}-${w}w${ext}`;
    try {
      const buf = await sharp(sourceBuf, { failOn: 'none' })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      if (!DRY) {
        const tmp = out + '.tmp';
        await fs.writeFile(tmp, buf);
        await fs.rename(tmp, out);
      }
      made.push(w);
      variantsWritten++; variantBytes += buf.length;
    } catch (e) {
      console.error(`  ! variant ${w}w failed: ${path.basename(file)} — ${e.message}`);
    }
  }
  if (made.length) manifest[key] = made;
}

const kb = b => (b / 1024).toFixed(0) + 'KB';

console.log(`\nOptimising images in: ${dir}`);
console.log(`Max width: ${MAX_WIDTH}px · quality: ${QUALITY}${DRY ? ' · DRY RUN (no writes)' : ''}\n`);

await walk(dir);

if (VARIANTS && !DRY) {
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 0) + '\n', 'utf8');
  console.log(`\n[variants] ${variantsWritten} files (${kb(variantBytes)}) · manifest: ${MANIFEST}`);
  console.log('           run `npm run build` next so the pages pick up the srcset.');
}

console.log('\n──────────────────────────────────────────');
console.log(`Scanned:  ${scanned}`);
console.log(`Optimised:${changed}   Skipped: ${skipped}   Errors: ${errors}`);
if (changed) {
  console.log(`Total:    ${kb(beforeBytes)} → ${kb(afterBytes)}  (saved ${Math.round((1 - afterBytes / beforeBytes) * 100)}%, ${kb(beforeBytes - afterBytes)})`);
}
console.log('──────────────────────────────────────────\n');
