import { Router } from 'express';
import Product from '../models/Product.js';
import Article from '../models/Article.js';
import Setting from '../models/Setting.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://demetriosbride-bg.com';

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
      { loc: '/about', priority: '0.6', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
      { loc: '/booking', priority: '0.8', changefreq: 'monthly' },
      { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
      { loc: '/accessories', priority: '0.6', changefreq: 'monthly' },
      { loc: '/demetrios', priority: '0.5', changefreq: 'monthly' },
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

router.get('/robots.txt', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    const settings = doc?.value || {};

    let txt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/api/sitemap.xml
`;
    if (settings.robots_extra) {
      txt += '\n' + settings.robots_extra + '\n';
    }

    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(txt);
  } catch (err) {
    res.status(500).send('Error generating robots.txt');
  }
});

export default router;
