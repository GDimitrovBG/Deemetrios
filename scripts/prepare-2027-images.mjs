// =============================================================================
//  prepare-2027-images.mjs
//  Turns the client's original Demetrios photos (Google Drive folder
//  "Колекция 2027") into the optimised .jpg + .webp files the site expects for
//  the 2027 models added to src/data.js.
//
//  WHY THIS EXISTS
//  The app always requests the .webp twin of an image (see src/cdn.js), while
//  data.js points at the .jpg. optimize-images.mjs only recompresses in the
//  same format and writes the responsive -480/-960/-1440w webp variants — it
//  does NOT create the base .webp from a .jpg. This script does both the base
//  .webp and the SEO filename the data.js entries reference.
//
//  INPUT
//  A folder with one sub-folder per model, named by the model number, each
//  holding the originals named <model>_1.jpg, <model>_2.jpg, …  — exactly the
//  layout of the Google Drive "Колекция 2027" folder. Download it as-is.
//
//      drive-2027/
//        1564/ 1564_1.jpg 1564_2.jpg 1564_3.jpg
//        1566/ 1566_1.jpg 1566_2.jpg
//        …
//
//  RUN
//      npm i sharp            # if not already installed
//      node scripts/prepare-2027-images.mjs /path/to/drive-2027
//
//  OUTPUT  →  deploy/uploads-inbox/2027/   (both .jpg and .webp, SEO names)
//  Then, same as the evening batch (see deploy/README.md):
//      rsync -a deploy/uploads-inbox/ /path/to/wp-content/uploads/
//      node scripts/optimize-images.mjs /path/to/wp-content/uploads --variants
//      npm run build
// =============================================================================

import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'deploy', 'uploads-inbox', '2027');
const MAX_WIDTH = 1600;
const Q_JPEG = 82;
const Q_WEBP = 80;

// model → number of photos. Must match the imgs arrays in src/data.js.
const MODELS = { '1564': 3, '1566': 2, '1567': 3, '1574': 2, '1581': 3, '1585': 2, '1589': 3, '1594': 4, '1596': 3, '1598': 3,
  '200177': 5, '200182': 2, '200189': 3, '8287': 2, '8289': 5, '8293': 2, '8295': 2, '8297': 3, '8299': 2, '8307': 2, '8315': 2 };

// The SEO filename stem used in src/data.js (without the _<n> index or extension).
// 8xxx models are Cosmobella; everything else (1xxx, 200xxx) is Demetrios.
const brandOf = (model) => model.startsWith('8') ? 'Cosmobella' : 'Demetrios';
const stem = (model) => `булчинска-рокля-${brandOf(model)}-${model}-София`;

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/prepare-2027-images.mjs <folder-with-model-subfolders>');
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
let made = 0;
const missing = [];

for (const [model, count] of Object.entries(MODELS)) {
  for (let i = 1; i <= count; i++) {
    // Accept <model>_<i>.jpg / .jpeg / .png, case-insensitive.
    const dir = path.join(src, model);
    let input = null;
    try {
      const files = await fs.readdir(dir);
      const hit = files.find(f => new RegExp(`^${model}[ _-]?0*${i}\\.(jpe?g|png)$`, 'i').test(f));
      if (hit) input = path.join(dir, hit);
    } catch { /* folder missing */ }
    if (!input) { missing.push(`${model}_${i}`); continue; }

    const base = `${stem(model)}_${i}`;
    const pipe = sharp(input, { failOn: 'none' }).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
    await pipe.clone().jpeg({ quality: Q_JPEG, mozjpeg: true }).toFile(path.join(OUT, `${base}.jpg`));
    await pipe.clone().webp({ quality: Q_WEBP }).toFile(path.join(OUT, `${base}.webp`));
    made++;
    console.log(`  ✓ ${model}_${i}  →  ${base}.jpg + .webp`);
  }
}

console.log(`\nDone: ${made} photos → ${OUT}`);
if (missing.length) {
  console.log(`Missing sources (skipped): ${missing.join(', ')}`);
  console.log('Make sure every model sub-folder holds <model>_1.jpg, <model>_2.jpg, …');
}
