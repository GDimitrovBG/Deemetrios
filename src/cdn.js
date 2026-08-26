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
//  It is also where responsive sizes are resolved. There is no CDN to resize
//  on the fly, so the smaller copies are real files written by
//  scripts/optimize-images.mjs --variants, and public/image-variants.json
//  records exactly which ones exist. srcsetFor() reads that manifest and stays
//  silent for anything not listed — so a page can never point the browser at a
//  variant that was never generated. Until the script is run on the server the
//  manifest is `{}` and every image behaves exactly as it does today.
//
//  If a CDN is ever revisited, this is the one seam to change — every image
//  in the app already goes through it.
// =====================================================

import VARIANTS from '../public/image-variants.json';

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

/**
 * A srcset for one of our uploads, or '' when no variants exist for it.
 *
 * The full-size file stays in the list at its own width so a wide desktop
 * still gets the sharp original; the smaller widths are what a phone picks.
 */
export function srcsetFor(src, fullWidth) {
  const path = cdnImage(src);
  if (typeof path !== 'string' || !path.startsWith('/wp-content/')) return '';
  const widths = VARIANTS[path];
  if (!widths || !widths.length) return '';
  const ext = path.slice(path.lastIndexOf('.'));
  const stem = path.slice(0, -ext.length);
  const parts = widths.map(w => `${stem}-${w}w${ext} ${w}w`);
  if (fullWidth) parts.push(`${path} ${fullWidth}w`);
  return parts.join(', ');
}
