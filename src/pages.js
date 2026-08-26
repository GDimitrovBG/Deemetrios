// =====================================================
//  ROUTE PAGES — code-split, but not on the way in
// =====================================================
//
//  Every route page lives in its own chunk so a visitor landing on the home
//  page never downloads the catalogue, booking and blog bundles up front.
//  React.lazy does that, but it has one cost that matters here: a lazy
//  component ALWAYS suspends on its first render, even when its module is
//  already in memory, because the loader returns a fresh promise that settles
//  a microtask later. React commits the Suspense fallback in the meantime.
//
//  On a prerendered page that is very visible. The browser paints the full
//  static page, then React replaces it with a 70vh placeholder for one frame,
//  then paints the real page again — a measured 0.30 Cumulative Layout Shift,
//  past Google's 0.25 "poor" threshold, on every route.
//
//  So: preload(route) resolves the landing route's component BEFORE the first
//  render, and pageFor() then hands back a plain component that cannot
//  suspend. Every other route still goes through React.lazy exactly as before,
//  which is what we want — those are real navigations where a brief fallback
//  is honest feedback rather than a jump.
// =====================================================
import { lazy } from 'react';

// route name → [chunk loader, exported component name]
const LOADERS = {
  home:        [() => import('./home'),    'HomePage'],
  collection:  [() => import('./catalog'), 'CollectionPage'],
  product:     [() => import('./catalog'), 'ProductPage'],
  wishlist:    [() => import('./catalog'), 'WishlistPage'],
  booking:     [() => import('./booking'), 'BookingPage'],
  quiz:        [() => import('./quiz'),    'QuizPage'],
  about:       [() => import('./info'),    'AboutPage'],
  contact:     [() => import('./info'),    'ContactPage'],
  blog:        [() => import('./info'),    'BlogPage'],
  'blog-post': [() => import('./info'),    'BlogPostPage'],
  demetrios:   [() => import('./info'),    'DemetriosPage'],
};

// route → component. Holds either a resolved component (after preload) or the
// React.lazy wrapper, so the same identity is reused across renders.
const cache = new Map();

/**
 * Resolve a route's component ahead of the first render.
 * Rejects are swallowed: a layout shift beats a blank page.
 */
export async function preloadRoute(route) {
  const entry = LOADERS[route];
  if (!entry) return;
  const [load, name] = entry;
  try {
    const mod = await load();
    if (mod?.[name]) cache.set(route, mod[name]);
  } catch { /* fall back to the lazy path below */ }
}

/** The component to render for a route, or null if the route has no chunk. */
export function pageFor(route) {
  const hit = cache.get(route);
  if (hit) return hit;
  const entry = LOADERS[route];
  if (!entry) return null;
  const [load, name] = entry;
  const Lazy = lazy(() => load().then(m => ({ default: m[name] })));
  cache.set(route, Lazy);
  return Lazy;
}
