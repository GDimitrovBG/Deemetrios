// =====================================================
//  CADDY REDIRECT GENERATOR — product ref case canonicalisation
//
//  THE BUG THIS FIXES
//  ------------------
//  Product refs in src/data.js are upper-cased (DR436, L1152, T238SK30).
//  Old WordPress product slugs carry the code lower-cased, e.g.
//      /product/evening-dress-style-r149/
//  and the existing Caddy rule rewrote that to /product/r149 — lower-case.
//
//  /product/r149 is NOT a prerendered directory (only /product/R149 is), so
//  Caddy's SPA fallback served dist/index.html — the prerendered HOME page,
//  complete with the home <title> and <link rel=canonical href="/">. Only
//  after rendering JS did the SPA correct the URL to /product/R149.
//
//  For Google that is: a product URL answering 200 with home-page content and
//  a home canonical, plus a JS-only redirect. It showed up across the
//  "Page with redirect" report and wasted crawl budget on ~40 products.
//
//  THE FIX
//  -------
//  Emit an explicit server-side 301 for every non-canonical casing straight to
//  the exact-case URL — one hop, no JS, no home-page HTML.
//
//  Each generated rule matches, for a ref like DR436:
//      /product/dr436                          (bare lower-case)
//      /product/evening-dress-style-dr436/     (old WP slug)
//      /product/style-dr436-2/                 (WP duplicate-slug suffix)
//  and never /product/DR436 itself, so it cannot loop.
//
//  Only refs containing letters are emitted — numeric refs (1500) have no
//  casing to canonicalise and the generic WP-slug rule already handles them.
//
//  RUN:  node scripts/generate-caddy-redirects.mjs
//        → rewrites the generated block in deploy/redirects.caddy in place
// =====================================================
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'deploy', 'redirects.caddy');

const START = '# >>> GENERATED: product ref case canonicalisation — do not edit by hand';
const END   = '# <<< END GENERATED';

const { DRESSES } = await import(pathToFileURL(path.join(ROOT, 'src/data.js')).href);

// Refs that contain letters are the only ones with a casing problem.
const refs = [...new Set(DRESSES.map(d => d.ref).filter(r => /[A-Za-z]/.test(r)))]
  .sort((a, b) => b.length - a.length || a.localeCompare(b)); // longest first: L1152 before L115

const rules = refs.map((ref, i) => {
  const lower = ref.toLowerCase();
  // [a-z0-9-]*style- also matches a bare "style-" prefix (/product/style-r180-2/).
  const re = `^/product/(?:[a-z0-9-]*style-)?${lower}(?:-\\d{1,2})?/?$`;
  return `@pc${i} path_regexp ${re}\nredir @pc${i} /product/${ref} 301`;
});

const block = [
  START,
  `# ${refs.length} lettered product refs — regenerate with:`,
  '#   node scripts/generate-caddy-redirects.mjs',
  '# Must sit BEFORE the generic "-style-" rule so it wins the one-hop redirect.',
  ...rules,
  END,
].join('\n');

let file = await fs.readFile(TARGET, 'utf8');
const s = file.indexOf(START);
const e = file.indexOf(END);
if (s !== -1 && e !== -1) {
  file = file.slice(0, s) + block + file.slice(e + END.length);
} else {
  // First run: insert immediately before the generic WP product-slug rule.
  const anchor = '# --- Old WP product slugs → canonical ref URL ---';
  if (!file.includes(anchor)) throw new Error('anchor comment not found in redirects.caddy');
  file = file.replace(anchor, `${block}\n\n${anchor}`);
}
await fs.writeFile(TARGET, file, 'utf8');
console.log(`[caddy] ${refs.length} product case-canonicalisation rules → deploy/redirects.caddy`);
