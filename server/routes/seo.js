import { Router } from 'express';
import Product from '../models/Product.js';
import Article from '../models/Article.js';
import Setting from '../models/Setting.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://demetriosbride-bg.com';

function xmlEscape(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    const settings = doc?.value || {};
    if (settings.sitemap_enabled === false) {
      return res.status(404).send('Sitemap disabled');
    }

    const products = await Product.find({}, 'ref updatedAt').lean();
    const articles = await Article.find({ visible: true }, 'id date updatedAt').lean();

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/collection', priority: '0.9', changefreq: 'weekly' },
      { loc: '/collection/demetrios',   priority: '0.85', changefreq: 'weekly' },
      { loc: '/collection/cosmobella',  priority: '0.85', changefreq: 'weekly' },
      { loc: '/collection/platinum',    priority: '0.85', changefreq: 'weekly' },
      { loc: '/collection/destination', priority: '0.85', changefreq: 'weekly' },
      { loc: '/collection/evening',     priority: '0.85', changefreq: 'weekly' },
      { loc: '/about', priority: '0.6', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
      { loc: '/booking', priority: '0.8', changefreq: 'monthly' },
      { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
      { loc: '/accessories', priority: '0.6', changefreq: 'monthly' },
      { loc: '/demetrios', priority: '0.5', changefreq: 'monthly' },
      { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
      { loc: '/cookies', priority: '0.3', changefreq: 'yearly' },
    ];

    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    for (const p of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>
`;
    }

    for (const p of products) {
      const mod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : now;
      xml += `  <url>
    <loc>${SITE_URL}/product/${p.ref}</loc>
    <lastmod>${mod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    for (const a of articles) {
      const mod = (a.updatedAt || a.date) ? new Date(a.updatedAt || a.date).toISOString().split('T')[0] : now;
      xml += `  <url>
    <loc>${SITE_URL}/blog/${a._id}</loc>
    <lastmod>${mod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// ── Image Sitemap ──────────────────────────────────────────────────────────
// Dedicated sitemap for Google Images — boosts image search discovery
// for bridal products. Uses image:image extension per sitemaps.org spec.
router.get('/sitemap-images.xml', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    const settings = doc?.value || {};
    if (settings.sitemap_enabled === false) return res.status(404).send('Sitemap disabled');

    const products = await Product.find({}, 'ref name_bg name_en img imgs collection').lean();
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;
    for (const p of products) {
      const allImgs = [...(p.imgs || []), p.img].filter(Boolean);
      if (!allImgs.length) continue;
      const title = p.name_bg || p.name_en || `Style ${p.ref}`;
      xml += `  <url>
    <loc>${xmlEscape(SITE_URL)}/product/${xmlEscape(p.ref)}</loc>
    <lastmod>${now}</lastmod>
`;
      for (const imgUrl of allImgs) {
        const absUrl = imgUrl.startsWith('http') ? imgUrl : `${SITE_URL}${imgUrl}`;
        xml += `    <image:image>
      <image:loc>${xmlEscape(absUrl)}</image:loc>
      <image:title>${xmlEscape(title)}</image:title>
      <image:caption>${xmlEscape(`${title} — булчинска рокля Areti, Sofia`)}</image:caption>
    </image:image>
`;
      }
      xml += `  </url>\n`;
    }
    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating image sitemap');
  }
});

// ── Sitemap Index — points crawlers to both sitemaps ───────────────────────
router.get('/sitemap-index.xml', async (req, res) => {
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/api/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/api/sitemap-images.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

router.get('/robots.txt', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    const settings = doc?.value || {};

    let txt = `User-agent: *
Allow: /

# AI crawlers — explicitly allowed so ChatGPT, Perplexity, Gemini, Claude can cite us
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

# Context file for AI systems
LLMs: ${SITE_URL}/llms.txt

Sitemap: ${SITE_URL}/api/sitemap-index.xml
Sitemap: ${SITE_URL}/api/sitemap.xml
Sitemap: ${SITE_URL}/api/sitemap-images.xml
`;
    if (settings.robots_extra) {
      // Strip anything that isn't valid robots.txt content (printable ASCII + newlines)
      const safe = String(settings.robots_extra)
        .slice(0, 2000)
        .replace(/[^\x20-\x7E\n\r]/g, '');
      txt += '\n' + safe + '\n';
    }

    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(txt);
  } catch (err) {
    res.status(500).send('Error generating robots.txt');
  }
});

export default router;
