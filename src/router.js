// =====================================================
//  ROUTER — URL ↔ SPA state, with WordPress redirect map
// =====================================================
import { DRESSES } from './data';
import { BLOG_POSTS } from './blog_data';

// Old WordPress paths → new SPA paths.
// Hosting-level configs (_redirects, vercel.json) issue real 301s for crawlers;
// this map is the in-app fallback so direct hits also resolve correctly.
const WP_REDIRECTS = {
  '/za-nas':              '/about',
  '/kontakti':            '/contact',
  '/zapishi-chas':        '/booking',
  '/za-demetrios':        '/demetrios',
  '/demetrios-platinum':  '/collection/platinum',
  '/cosmobella':          '/collection/cosmobella',
  '/destination-romance': '/collection/destination',
  '/otzivi':              '/about',
  '/fqa':                 '/contact',
  '/nashite-bulki':       '/about',
  '/author/areti1':       '/',
  '/bulchinski-rokli':    '/collection',
  '/bulchinski-rokli-2':  '/collection',
  '/bulchenski-rokli-sofia': '/collection',
  '/vecherni-rokli':      '/collection/evening',
  '/булчински-рокли-и-сватбени-рокли-в-соф': '/collection',
  '/бална-рокля-според-фигурата-как-да-изб': '/blog/balna-roklia-spored-figurata',
  '/кой-е-demetrios':     '/blog/koi-e-demetrios',
  '/сватбен-магазин-в-софия-сватбени-ро': '/collection',
};

function patternRedirect(p) {
  if (/^\/bulchinski-rokli\/page\/\d+$/.test(p)) return '/collection';
  if (/^\/vecherni-rokli\/page\/\d+$/.test(p)) return '/collection/evening';
  if (/^\/blog\/page\/\d+$/.test(p)) return '/blog';

  if (p.startsWith('/product-category/')) {
    const slug = p.slice('/product-category/'.length);
    if (/demetrios/i.test(slug)) return '/collection/demetrios';
    if (/cosmobella/i.test(slug)) return '/collection/cosmobella';
    if (/platinum/i.test(slug)) return '/collection/platinum';
    if (/destin|romance/i.test(slug)) return '/collection/destination';
    if (/вечерни|evening|abiturient/i.test(slug)) return '/collection/evening';
    return '/collection';
  }

  // Old WP product URLs: /product/wedding-dress-style-1505 → /product/1505 if ref exists.
  // Only triggers for slugs that DON'T already match the ref (avoids redirect loop on /product/1505).
  if (p.startsWith('/product/')) {
    const slug = p.slice('/product/'.length);
    if (DRESSES.some(d => d.ref === slug)) return null;  // valid ref, no redirect needed
    // Old WP slugs end in "...-style-<code>" (sometimes with a "-2" duplicate
    // suffix). Prefer the code after the last "style-" marker, then strip any
    // WP duplicate suffix, then match the ref code.
    let codePart = slug;
    const styleIdx = slug.lastIndexOf('style-');
    if (styleIdx !== -1) codePart = slug.slice(styleIdx + 'style-'.length);
    codePart = codePart.replace(/-\d{1,2}$/, '');
    const m = codePart.match(/^([A-Za-z]{0,4}\d{2,6})/) || slug.match(/([A-Za-z]{0,4}\d{2,6})$/);
    if (m) {
      const candidate = m[1];
      const found = DRESSES.find(d => d.ref.toUpperCase() === candidate.toUpperCase());
      if (found) return `/product/${found.ref}`;
    }
    return '/collection';
  }
  return null;
}

const COLLECTION_IDS = ['cosmobella','demetrios','platinum','destination','evening'];
// Silhouette landing pages — /collection/silueti/<slug>. Slugs kept in sync
// with SILHOUETTE_PAGES in catalog.jsx (rusalka/printsesa/a-siluet).
const SILHOUETTE_IDS = ['rusalka','printsesa','a-siluet'];

function normalize(pathname) {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = '/' + p;
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  try { p = decodeURIComponent(p); } catch {}
  return p;
}

// -----------------------------------------------------------------------------
//  Language prefix. Bulgarian is the default locale and keeps its bare URLs
//  (they carry all current rankings — never move them). English lives under
//  /en/*. The blog is deliberately excluded: none of the 14 posts are
//  translated, and publishing untranslated locale pages is worse than not
//  having them, so /en/blog* folds back to the Bulgarian blog.
// -----------------------------------------------------------------------------
export const LANGS = ['bg', 'en'];

export function splitLang(pathname) {
  const p = normalize(pathname);
  if (p === '/en') return { lang: 'en', path: '/' };
  if (p.startsWith('/en/')) return { lang: 'en', path: p.slice(3) };
  return { lang: 'bg', path: p };
}

/** Prefix a Bulgarian path with the locale (no-op for bg). */
export function withLang(path, lang) {
  if (lang !== 'en') return path;
  return path === '/' ? '/en' : `/en${path}`;
}

/** Does this blog post have an English translation? */
const hasEnPost = (id) => {
  const p = BLOG_POSTS.find(b => b.id === id || String(b.id) === String(id));
  return !!p?.title_en;
};

/** Routes that exist only in Bulgarian. The blog LISTING is bilingual;
 *  individual posts are Bulgarian-only unless translated. */
const BG_ONLY = (route, blogPostId) =>
  route === 'blog-post' && !hasEnPost(blogPostId);

export function pathToState(pathname) {
  const { lang, path } = splitLang(pathname);
  const s = pathToStateInner(path);

  if (s.redirect) return { ...s, redirect: withLang(s.redirect, lang), lang };
  // Untranslated blog posts have no /en twin — send those URLs to the
  // Bulgarian original rather than serving an untranslated page.
  if (lang === 'en' && BG_ONLY(s.route, s.blogPostId)) return { redirect: path, lang: 'bg' };
  return { ...s, lang };
}

function pathToStateInner(pathname) {
  const p = normalize(pathname);

  if (WP_REDIRECTS[p] !== undefined) return { redirect: WP_REDIRECTS[p] };
  const pr = patternRedirect(p);
  if (pr) return { redirect: pr };

  if (p === '/') return { route: 'home' };
  if (p === '/collection') return { route: 'collection', collectionId: null };

  const silMatch = p.match(/^\/collection\/silueti\/([a-z-]+)$/);
  if (silMatch && SILHOUETTE_IDS.includes(silMatch[1])) {
    return { route: 'collection', collectionId: null, silhouetteId: silMatch[1] };
  }
  if (p === '/collection/silueti') return { redirect: '/collection' };

  const collMatch = p.match(/^\/collection\/([a-z]+)$/);
  if (collMatch && COLLECTION_IDS.includes(collMatch[1])) {
    return { route: 'collection', collectionId: collMatch[1] };
  }

  const prodMatch = p.match(/^\/product\/([A-Za-z0-9_]+)$/);
  if (prodMatch) {
    const ref = prodMatch[1];
    if (DRESSES.some(d => d.ref === ref)) {
      return { route: 'product', productRef: ref };
    }
    // Case-insensitive match → canonicalise the casing (e.g. /product/dr436
    // → /product/DR436). Lets a server-side 301 redirect safely to a
    // lower-cased ref without bouncing to /collection.
    const ci = DRESSES.find(d => d.ref.toUpperCase() === ref.toUpperCase());
    if (ci) return { redirect: `/product/${ci.ref}` };
    return { redirect: '/collection' };
  }

  if (p === '/kviz')        return { route: 'quiz' };
  if (p === '/accessories') return { route: 'accessories' };
  if (p === '/booking')     return { route: 'booking' };
  if (p === '/wishlist')    return { route: 'wishlist' };
  if (p === '/about')       return { route: 'about' };
  if (p === '/demetrios')   return { route: 'demetrios' };
  if (p === '/contact')     return { route: 'contact' };
  if (p === '/blog')        return { route: 'blog' };

  // Slug-based blog URLs: /blog/bulchinska-roklia-moment-ne-prosto-pokupka
  const blogSlugMatch = p.match(/^\/blog\/([a-z][a-z0-9-]+)$/);
  if (blogSlugMatch) {
    const slug = blogSlugMatch[1];
    const post = BLOG_POSTS.find(b => b.slug === slug);
    if (post) return { route: 'blog-post', blogPostId: post.id };
    return { redirect: '/blog' };
  }

  // Legacy numeric blog URLs: /blog/25957256 → redirect to slug
  const blogNumMatch = p.match(/^\/blog\/(\d+)$/);
  if (blogNumMatch) {
    const id = Number(blogNumMatch[1]);
    const post = BLOG_POSTS.find(b => b.id === id);
    if (post) {
      const target = post.slug ? `/blog/${post.slug}` : null;
      return target ? { redirect: target } : { route: 'blog-post', blogPostId: id };
    }
    return { redirect: '/blog' };
  }

  if (p === '/privacy') return { route: 'privacy' };
  if (p === '/terms')   return { route: 'terms' };
  if (p === '/cookies') return { route: 'cookies' };

  // Unknown URL → noindex 404 page (avoids soft-404: home content on a foreign URL)
  return { route: 'not-found' };
}

export function stateToPath({ route, collectionId, productRef, blogPostId, silhouetteId, lang = 'bg' }) {
  const path = stateToPathInner({ route, collectionId, productRef, blogPostId, silhouetteId });
  // Untranslated posts never take the /en prefix; everything else localizes.
  return BG_ONLY(route, blogPostId) ? path : withLang(path, lang);
}

function stateToPathInner({ route, collectionId, productRef, blogPostId, silhouetteId }) {
  switch (route) {
    case 'home':        return '/';
    case 'collection':
      if (silhouetteId) return `/collection/silueti/${silhouetteId}`;
      return collectionId ? `/collection/${collectionId}` : '/collection';
    case 'product':     return productRef ? `/product/${productRef}` : '/collection';
    case 'quiz':        return '/kviz';
    case 'accessories': return '/accessories';
    case 'booking':     return '/booking';
    case 'wishlist':    return '/wishlist';
    case 'about':       return '/about';
    case 'demetrios':   return '/demetrios';
    case 'contact':     return '/contact';
    case 'blog':        return '/blog';
    case 'blog-post': {
      if (!blogPostId) return '/blog';
      const post = BLOG_POSTS.find(b => b.id === blogPostId);
      return post?.slug ? `/blog/${post.slug}` : `/blog/${blogPostId}`;
    }
    case 'privacy':     return '/privacy';
    case 'terms':       return '/terms';
    case 'cookies':     return '/cookies';
    default:            return '/';
  }
}

export function readInitialState() {
  if (typeof window === 'undefined') return { route: 'home' };
  if (window.location.hash === '#admin') return { route: 'admin' };
  const s = pathToState(window.location.pathname);
  if (s.redirect) {
    window.history.replaceState({}, '', s.redirect);
    return pathToState(s.redirect);
  }
  return s;
}
