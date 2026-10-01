// =====================================================
//  SITEMAP GENERATOR
//
//  Rebuilds public/sitemap.xml from the real data (DRESSES + BLOG_POSTS)
//  and the known static routes. Product URLs get <image:image> entries so
//  the dress photos are eligible for Google Images — a meaningful channel
//  for a visual, bridal business.
//
//  Existing per-URL <lastmod>/<changefreq>/<priority> values are PRESERVED
//  (parsed from the current sitemap) so we never reset Google's freshness
//  signals; only new URLs get defaults and product image blocks are added.
//
//  Runs automatically before `vite build` (see package.json). Manual run:
//    node scripts/generate-sitemap.mjs
// =====================================================
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://demetriosbride-bg.com';
const OUT = path.join(ROOT, 'public', 'sitemap.xml');

const COLLECTION_IDS = ['cosmobella', 'demetrios', 'platinum', 'destination', 'evening'];
const SILHOUETTE_IDS = ['rusalka', 'printsesa', 'a-siluet'];
const MATERIAL_IDS = ['dantela', 'tyul', 'saten', 'mikado'];
const CITY_IDS = ['varna', 'plovdiv'];

// XML-escape text for use inside a tag.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Encode a path for a URL while keeping the structural slashes readable.
const absImg = (u) => {
  if (!u) return '';
  const withHost = u.startsWith('http') ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`;
  // On-page <img> is served as WebP (see cdn.js), so list the WebP twin.
  const webp = withHost.replace(/\.jpe?g$/i, '.webp');
  return encodeURI(webp);
};

// Parse the existing sitemap into { loc: { lastmod, changefreq, priority } }.
async function readExistingMeta() {
  const meta = {};
  try {
    const xml = await fs.readFile(OUT, 'utf8');
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    for (const b of blocks) {
      const loc = (b.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      if (!loc) continue;
      meta[loc.trim()] = {
        lastmod:    (b.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1],
        changefreq: (b.match(/<changefreq>([^<]+)<\/changefreq>/) || [])[1],
        priority:   (b.match(/<priority>([^<]+)<\/priority>/) || [])[1],
      };
    }
  } catch { /* first run — no existing file */ }
  return meta;
}

function heading(d) {
  const kind = d.collection === 'evening' ? 'Официална рокля' : 'Булчинска рокля';
  return `${kind} Style ${d.ref} — Demetrios | Арети София`;
}

/**
 * One <url> block.
 *
 * `bgPath` (when given) means the page exists in both locales: we emit the
 * Bulgarian and English <xhtml:link> alternates plus x-default, on BOTH the
 * bg and en entries. Each URL must list itself as well, or Google discards
 * the whole cluster.
 */
function urlBlock(loc, meta, def, images = [], bgPath = null, hasEl = true) {
  const m = meta[loc] || {};
  const lastmod    = m.lastmod    || def.lastmod;
  const changefreq = m.changefreq || def.changefreq;
  const priority   = m.priority   || def.priority;
  const imgXml = images.map(im =>
    `\n    <image:image><image:loc>${im.loc}</image:loc><image:title>${esc(im.title)}</image:title>` +
    (im.caption ? `<image:caption>${esc(im.caption)}</image:caption>` : '') +
    `</image:image>`
  ).join('');
  let altXml = '';
  if (bgPath) {
    const bgUrl = `${SITE}${bgPath}`;
    const enUrl = `${SITE}${bgPath === '/' ? '/en/' : `/en${bgPath}`}`;
    const elUrl = `${SITE}${bgPath === '/' ? '/el/' : `/el${bgPath}`}`;
    altXml =
      `\n    <xhtml:link rel="alternate" hreflang="bg" href="${bgUrl}"/>` +
      `\n    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>` +
      // el is a full locale for every page EXCEPT blog posts (no Greek twin
      // yet), which pass hasEl=false so their cluster stays bg/en only.
      (hasEl ? `\n    <xhtml:link rel="alternate" hreflang="el" href="${elUrl}"/>` : '') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${bgUrl}"/>`;
  }
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${altXml}${imgXml}
  </url>`;
}

async function run() {
  const { DRESSES } = await import(pathToFileURL(path.join(ROOT, 'src/data.js')).href);
  const { BLOG_POSTS } = await import(pathToFileURL(path.join(ROOT, 'src/blog_data.js')).href);
  const meta = await readExistingMeta();
  const today = new Date().toISOString().slice(0, 10);
  const out = [];

  // Emits the Bulgarian URL and its English + Greek twins, each carrying the
  // full hreflang set. Pass { hasEl: false } for pages that exist only in
  // bg/en (translated blog posts).
  const pair = (path, def, images = [], { hasEl = true } = {}) => {
    out.push(urlBlock(`${SITE}${path}`, meta, def, images, path, hasEl));
    // '/en/' and '/el/' keep the trailing slash — the server 301s /en → /en/,
    // and a sitemap entry that redirects is reported as "Page with redirect".
    const enPath = path === '/' ? '/en/' : `/en${path}`;
    // Secondary locales get a slightly lower priority so crawl budget favours
    // the primary market. Images are listed once, on the Bulgarian entry.
    const secPriority = String(Math.max(0.1, Number(def.priority) - 0.1).toFixed(1));
    out.push(urlBlock(`${SITE}${enPath}`, meta, { ...def, priority: secPriority }, [], path, hasEl));
    if (hasEl) {
      const elPath = path === '/' ? '/el/' : `/el${path}`;
      out.push(urlBlock(`${SITE}${elPath}`, meta, { ...def, priority: secPriority }, [], path, hasEl));
    }
  };

  // --- Static pages -------------------------------------------------------
  pair('/', { lastmod: today, changefreq: 'weekly', priority: '1.0' });
  // Greek-only support pages (prices, the travel guide for brides from Greece)
  // — no hreflang cluster, they exist in one language.
  out.push(urlBlock(`${SITE}/el/times/`,  meta, { lastmod: today, changefreq: 'monthly', priority: '0.6' }));
  out.push(urlBlock(`${SITE}/el/odigos/`, meta, { lastmod: today, changefreq: 'monthly', priority: '0.6' }));
  pair('/collection', { lastmod: today, changefreq: 'weekly', priority: '0.9' });
  for (const id of COLLECTION_IDS) {
    pair(`/collection/${id}`, { lastmod: today, changefreq: 'weekly', priority: '0.8' });
  }
  for (const id of SILHOUETTE_IDS) {
    pair(`/collection/silueti/${id}`, { lastmod: today, changefreq: 'monthly', priority: '0.7' });
  }
  for (const id of MATERIAL_IDS) {
    pair(`/collection/materii/${id}`, { lastmod: today, changefreq: 'monthly', priority: '0.7' });
  }
  // City pages are BG + EN only — Greek brides don't search Bulgarian cities.
  for (const id of CITY_IDS) {
    pair(`/collection/gradove/${id}`, { lastmod: today, changefreq: 'monthly', priority: '0.7' }, [], { hasEl: false });
  }
  // Season landing page — changes with every delivery, so weekly.
  pair('/collection/2027', { lastmod: today, changefreq: 'weekly', priority: '0.8' });
  // Free tool — high-intent landing page, worth a strong priority.
  pair('/kviz', { lastmod: today, changefreq: 'monthly', priority: '0.8' });
  for (const p of ['/booking', '/about', '/demetrios', '/contact']) {
    pair(p, { lastmod: today, changefreq: 'monthly', priority: '0.7' });
  }
  for (const p of ['/privacy', '/terms', '/cookies']) {
    pair(p, { lastmod: today, changefreq: 'yearly', priority: '0.3' });
  }
  // Blog listing is bilingual (/en/blog lists the translated posts).
  pair('/blog', { lastmod: today, changefreq: 'monthly', priority: '0.7' });

  // --- Product pages (with image entries) ---------------------------------
  // No cap: every gallery photo is a distinct, indexable asset for Google Images.
  for (const d of DRESSES) {
    const imgs = (d.imgs && d.imgs.length ? d.imgs : [d.img]).filter(Boolean);
    const images = imgs.map((u, i) => ({
      loc: absImg(u),
      title: i === 0 ? heading(d) : `${heading(d)} — детайл ${i + 1}`,
      caption: `${heading(d)} — булчински салон Арети, София`,
    }));
    pair(`/product/${d.ref}`, { lastmod: today, changefreq: 'monthly', priority: '0.7' }, images);
  }

  // --- Blog posts (translated ones get their /en twin + hreflang) ----------
  for (const b of BLOG_POSTS) {
    const slug = b.slug ? `/blog/${b.slug}` : `/blog/${b.id}`;
    const images = b.image ? [{ loc: absImg(b.image), title: esc(b.title || 'Блог — Арети') }] : [];
    // Blog posts have no Greek twin yet → bg/en only (hasEl:false).
    if (b.title_en) pair(slug, { lastmod: today, changefreq: 'monthly', priority: '0.6' }, images, { hasEl: false });
    else out.push(urlBlock(`${SITE}${slug}`, meta, { lastmod: today, changefreq: 'monthly', priority: '0.6' }, images));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${out.join('\n')}
</urlset>
`;
  await fs.writeFile(OUT, xml, 'utf8');
  const imgCount = (xml.match(/<image:image>/g) || []).length;
  console.log(`[sitemap] ${out.length} URLs, ${imgCount} image entries → public/sitemap.xml`);
}

run().catch(err => { console.error('[sitemap] failed:', err); process.exit(1); });
