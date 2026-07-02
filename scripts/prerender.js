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
    '/accessories',
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

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
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

  // Strip the Vite dev runtime + serialize.
  const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);

  await page.close();
  return html;
}

// ---- Write output --------------------------------------------------------
async function writeRoute(route, html) {
  const target = route === '/'
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
      try {
        const html = await renderRoute(browser, route);
        await writeRoute(route, html);
        const ms = Date.now() - tStart;
        ok.push({ route, ms });
        console.log(`  ✓ [${String(idx + 1).padStart(3)}/${routes.length}] ${route}  (${ms}ms)`);
      } catch (err) {
        failed.push({ route, err: err.message });
        console.error(`  ✗ [${String(idx + 1).padStart(3)}/${routes.length}] ${route}  → ${err.message}`);
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
