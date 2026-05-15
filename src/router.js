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
  '/bulchinski-rokli':    '/collection/demetrios',
  '/bulchinski-rokli-2':  '/collection',
  '/bulchenski-rokli-sofia': '/collection',
  '/vecherni-rokli':      '/collection/evening',
  '/булчински-рокли-и-сватбени-рокли-в-соф': '/collection',
  '/бална-рокля-според-фигурата-как-да-изб': '/blog',
  '/кой-е-demetrios':     '/demetrios',
  '/сватбен-магазин-в-софия-сватбени-ро': '/collection',
};

function patternRedirect(p) {
  if (/^\/bulchinski-rokli\/page\/\d+$/.test(p)) return '/collection/demetrios';
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
    const m = slug.match(/([A-Za-z]{0,3}\d{2,6})$/);
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

function normalize(pathname) {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = '/' + p;
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  try { p = decodeURIComponent(p); } catch {}
  return p;
}

export function pathToState(pathname) {
  const p = normalize(pathname);

  if (WP_REDIRECTS[p] !== undefined) return { redirect: WP_REDIRECTS[p] };
  const pr = patternRedirect(p);
  if (pr) return { redirect: pr };

  if (p === '/') return { route: 'home' };
  if (p === '/collection') return { route: 'collection', collectionId: null };

  const collMatch = p.match(/^\/collection\/([a-z]+)$/);
  if (collMatch && COLLECTION_IDS.includes(collMatch[1])) {
    return { route: 'collection', collectionId: collMatch[1] };
  }

  const prodMatch = p.match(/^\/product\/([A-Za-z0-9]+)$/);
  if (prodMatch) {
    const ref = prodMatch[1];
    if (DRESSES.some(d => d.ref === ref)) {
      return { route: 'product', productRef: ref };
    }
    return { redirect: '/collection' };
  }

  if (p === '/accessories') return { route: 'accessories' };
  if (p === '/booking')     return { route: 'booking' };
  if (p === '/wishlist')    return { route: 'wishlist' };
  if (p === '/about')       return { route: 'about' };
  if (p === '/demetrios')   return { route: 'demetrios' };
  if (p === '/contact')     return { route: 'contact' };
  if (p === '/blog')        return { route: 'blog' };

  const blogMatch = p.match(/^\/blog\/(\d+)$/);
  if (blogMatch) {
    const id = Number(blogMatch[1]);
    if (BLOG_POSTS.some(b => b.id === id)) {
      return { route: 'blog-post', blogPostId: id };
    }
    return { redirect: '/blog' };
  }

  if (p === '/privacy') return { route: 'privacy' };
  if (p === '/terms')   return { route: 'terms' };
  if (p === '/cookies') return { route: 'cookies' };

  return { redirect: '/' };
}

export function stateToPath({ route, collectionId, productRef, blogPostId }) {
  switch (route) {
    case 'home':        return '/';
    case 'collection':  return collectionId ? `/collection/${collectionId}` : '/collection';
    case 'product':     return productRef ? `/product/${productRef}` : '/collection';
    case 'accessories': return '/accessories';
    case 'booking':     return '/booking';
    case 'wishlist':    return '/wishlist';
    case 'about':       return '/about';
    case 'demetrios':   return '/demetrios';
    case 'contact':     return '/contact';
    case 'blog':        return '/blog';
    case 'blog-post':   return blogPostId ? `/blog/${blogPostId}` : '/blog';
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
