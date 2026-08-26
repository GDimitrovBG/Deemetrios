// =====================================================
//  PRE-RENDER — generates static HTML for every route
//
//  Why: the app is a React SPA. Crawlers without JS see
//  <div id="app"></div>. This script boots a headless
//  browser, navigates to every public route, waits for
//  React + useSeo to settle, and writes the final HTML
//  to dist/<route>/index.html so Caddy can serve it as
//  a static file.
//
//  Run: npm run build (vite build chains this script).
// =====================================================
import { createServer } from 'http';
import handler from 'serve-handler';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 4179;
const CONCURRENCY = 4;
const NAV_TIMEOUT = 30_000;
const SEO_SETTLE_MS = 400;

// A deliberately non-existent path: the SPA renders its noindex 404 page for it.
// The snapshot becomes dist/404.html, which Caddy serves as the fallback for
// unknown URLs — previously that fallback was dist/index.html, so any unmatched
// URL (a removed product, an old WP taxonomy) answered 200 with the HOME page's
// content and canonical. A noindex 404 shell is the correct answer instead.
const NOT_FOUND_ROUTE = '/__not-found__';

// ---- Routes ---------------------------------------------------------------
async function loadRoutes() {
  const data = await import(pathToFileURL(path.join(ROOT, 'src/data.js')).href);
  const blog = await import(pathToFileURL(path.join(ROOT, 'src/blog_data.js')).href);

  const staticRoutes = [
    '/',
    '/collection',
    '/collection/cosmobella',
    '/collection/demetrios',
    '/collection/platinum',
    '/collection/destination',
    '/collection/evening',
    '/collection/silueti/rusalka',
    '/collection/silueti/printsesa',
    '/collection/silueti/a-siluet',
    '/kviz',
    '/booking',
    '/about',
    '/demetrios',
    '/contact',
    '/blog',
    '/privacy',
    '/terms',
    '/cookies',
  ];

  const productRoutes = data.DRESSES.map(d => `/product/${d.ref}`);
  const blogRoutes = blog.BLOG_POSTS.map(b => b.slug ? `/blog/${b.slug}` : `/blog/${b.id}`);

  const bgRoutes = [...staticRoutes, ...productRoutes, ...blogRoutes];

  // English mirrors everything except untranslated blog posts. The /en/blog
  // listing exists (it lists only translated posts), and posts carrying
  // title_en get their /en twin; the rest redirect to the Bulgarian original.
  const enBlogRoutes = ['/blog', ...blog.BLOG_POSTS.filter(b => b.title_en).map(b => `/blog/${b.slug}`)];
  const enRoutes = [...staticRoutes.filter(r => !r.startsWith('/blog')), ...productRoutes, ...enBlogRoutes]
    .map(r => (r === '/' ? '/en' : `/en${r}`));

  return [...bgRoutes, ...enRoutes, NOT_FOUND_ROUTE];
}

// ---- Local SPA server (always returns index.html for unknown paths) ------
function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      handler(req, res, {
        public: DIST,
        rewrites: [{ source: '**', destination: '/index.html' }],
        headers: [{ source: '**', headers: [{ key: 'Cache-Control', value: 'no-store' }] }],
      });
    });
    server.once('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

// ---- Render one route via Puppeteer --------------------------------------
async function renderRoute(browser, route) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1800 });
  // Flag prerender mode BEFORE any app code runs — collection pages use it to
  // render ALL products (crawlable <a href> links) instead of the first
  // load-more page. Real visitors still get the paginated 20-at-a-time UX.
  await page.evaluateOnNewDocument(() => { window.__PRERENDER__ = true; });
  // Block external images during prerender — we only need the HTML, not assets.
  // Speeds the run by ~10×; nav images still resolve via <link rel=preload> tags.
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (type === 'image' || type === 'media' || type === 'font') req.abort();
    else req.continue();
  });

  const url = `http://localhost:${PORT}${route}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: NAV_TIMEOUT });

  // Wait for the SEO hook to mark the document ready (useEffect-driven head mutations).
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-seo-ready') === '1',
    { timeout: 8_000 }
  ).catch(() => { /* some routes may not mount useSeo — still snapshot what's there */ });

  // Brief grace period for trailing micro-tasks (JSON-LD insertion, hreflang loop).
  await page.evaluate(ms => new Promise(r => setTimeout(r, ms)), SEO_SETTLE_MS);

  // Guard against snapshotting an empty shell. Under load the React tree can
  // still be mounting when the SEO-ready wait times out, and the .catch above
  // would happily serialise `<div id="app"></div>` — a page that looks fine to
  // the build but is blank to a crawler. Wait for actual rendered children.
  const mounted = await page.waitForFunction(
    () => {
      const app = document.getElementById('app');
      return !!app && app.children.length > 0;
    },
    { timeout: 10_000 }
  ).then(() => true).catch(() => false);

  if (!mounted) {
    await page.close();
    throw new Error('rendered an empty #app (React never mounted)');
  }

  // Strip the Vite dev runtime + serialize.
  const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);

  await page.close();
  return html;
}

// ---- Write output --------------------------------------------------------
async function writeRoute(route, html) {
  // The 404 shell is written to dist/404.html (not a directory) so Caddy can
  // use it as the SPA fallback for unknown URLs. See NOT_FOUND_ROUTE below.
  const target = route === NOT_FOUND_ROUTE
    ? path.join(DIST, '404.html')
    : route === '/'
    ? path.join(DIST, 'index.html')
    : path.join(DIST, route, 'index.html');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, 'utf8');
}

// ---- Driver --------------------------------------------------------------
async function run() {
  const t0 = Date.now();
  const routes = await loadRoutes();
  console.log(`[prerender] ${routes.length} routes — concurrency ${CONCURRENCY}\n`);

  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const ok = [];
  const failed = [];
  let i = 0;

  async function worker() {
    while (i < routes.length) {
      const idx = i++;
      const route = routes[idx];
      const tStart = Date.now();
      // Retry transient failures: at concurrency 4 a slow page can exceed the
      // navigation timeout purely from contention, and a silent miss would ship
      // a blank page. Two extra attempts with a short backoff clears those.
      let html = null, lastErr = null;
      for (let attempt = 1; attempt <= 3 && html === null; attempt++) {
        try {
          html = await renderRoute(browser, route);
        } catch (err) {
          lastErr = err;
          if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
      if (html !== null) {
        await writeRoute(route, html);
        const ms = Date.now() - tStart;
        ok.push({ route, ms });
        console.log(`  ✓ [${String(idx + 1).padStart(3)}/${routes.length}] ${route}  (${ms}ms)`);
      } else {
        failed.push({ route, err: lastErr.message });
        console.error(`  ✗ [${String(idx + 1).padStart(3)}/${routes.length}] ${route}  → ${lastErr.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await browser.close();
  server.close();

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[prerender] done in ${totalSec}s — ${ok.length} ok, ${failed.length} failed`);

  if (failed.length) {
    console.log('\nFailed routes:');
    for (const f of failed) console.log(`  ${f.route} — ${f.err}`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[prerender] fatal:', err);
  process.exit(1);
});
