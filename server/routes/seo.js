import { Router } from 'express';
import Setting from '../models/Setting.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://demetriosbride-bg.com';

// ─────────────────────────────────────────────────────────────────────────────
//  NOTE — the canonical sitemap is the STATIC /sitemap.xml built at deploy time
//  by scripts/generate-sitemap.mjs and served directly by Caddy. robots.txt
//  below declares only that one.
//
//  The /api/sitemap*.xml endpoints used to serve their own DB-driven XML,
//  which was retired because:
//    • they emitted <lastmod> = request time on every fetch, so every URL always
//      looked "just modified" — Google learns to distrust lastmod entirely;
//    • the storefront renders from src/data.js (not the DB), so a DB-driven
//      sitemap can list URLs that differ from what is actually prerendered;
//    • two overlapping sitemap sets are a conflicting signal.
//  Declaring both was causing exactly that overlap. Keep one source of truth.
// ─────────────────────────────────────────────────────────────────────────────
// The three legacy endpoints now answer 301 → the canonical file. They were
// still serving a second, DB-driven sitemap with a different URL set (no /en
// twins, no hreflang, a blog list frozen at 14 posts) — and SEO-CHECKLIST.md
// told the client to submit exactly these to Search Console. Any old GSC
// submission or cached fetch now lands on the real sitemap instead of a fork.
router.get('/sitemap.xml',        (req, res) => res.redirect(301, '/sitemap.xml'));
router.get('/sitemap-images.xml', (req, res) => res.redirect(301, '/sitemap.xml'));
router.get('/sitemap-index.xml',  (req, res) => res.redirect(301, '/sitemap.xml'));

router.get('/robots.txt', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    const settings = doc?.value || {};

    // THIS is the robots.txt the site actually serves: Caddy proxies /robots.txt
    // to the API, so public/robots.txt in the repo is only the fallback if the
    // backend is down. Keep the two identical — they drifted once already, and
    // the served copy was the stale one.
    let txt = `User-agent: *
Allow: /

# Not useful in an index: the admin panel and a per-visitor wishlist.
Disallow: /admin
Disallow: /wishlist

# AI crawlers — explicitly allowed so ChatGPT, Perplexity, Gemini and Claude
# can read and cite the salon. /llms.txt holds the plain-language summary they
# use; it is discoverable at its conventional path, so it needs no directive
# here. A "LLMs:" line used to sit below — it is not part of the robots.txt
# grammar, and Lighthouse reported the whole file as invalid because of it.
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
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
