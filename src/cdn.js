// =====================================================
//  IMAGE URL HELPER
// =====================================================
//
//  This file used to be a Bunny.net integration: a `CDN_BASE` constant with
//  setup instructions, plus a `cdnSrcset()` that built `?width=` variants.
//  Using an external CDN was decided against, so `CDN_BASE` sat empty — which
//  meant `cdnSrcset()` returned '' on every single call and the whole module
//  did exactly one useful thing.
//
//  That one thing is kept here, and it is the thing that actually matters:
//  our uploads directory holds a WebP twin next to every JPEG (see
//  scripts/optimize-images.mjs), and WebP is roughly half the bytes at the
//  same quality. Point every <img> at the twin.
//
//  If a CDN is ever revisited, this is the one seam to change — every image
//  in the app already goes through it.
// =====================================================

const ORIGIN_RE = /^https?:\/\/(www\.)?demetriosbride-bg\.com/i;

/**
 * Resolve one of our uploaded images to the URL that should actually be
 * requested. Site-relative in, site-relative out.
 *
 * Anything that isn't one of our own uploads (a data: URI, an external host,
 * a bundled asset) is returned untouched.
 *
 * @param {string} src  image path or absolute URL
 * @returns {string}
 */
export function cdnImage(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Normalise to a site-relative path; only rewrite our own uploads.
  const path = src.replace(ORIGIN_RE, '');
  if (!path.startsWith('/wp-content/')) return src;

  return path.replace(/\.jpe?g$/i, '.webp');
}
