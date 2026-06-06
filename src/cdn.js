// =====================================================
//  CDN (Bunny.net) image routing + on-the-fly optimization
// =====================================================
//
//  HOW TO TURN ON:
//  1. In Bunny.net create a Pull Zone with Origin = https://demetriosbride-bg.com
//  2. Enable "Bunny Optimizer" on that zone (auto WebP/AVIF + compression).
//  3. Copy the zone hostname (e.g. https://areti.b-cdn.net) into CDN_BASE below.
//  4. Rebuild + deploy. Done — all uploaded images now go through Bunny,
//     auto-converted to WebP and resized to the size each slot actually needs.
//
//  Leave CDN_BASE empty to serve images straight from the origin (current
//  behaviour — zero change). This file is a no-op until you paste a host.

export const CDN_BASE = ''; // ← paste your Bunny host here, e.g. 'https://areti.b-cdn.net'

const ORIGIN_RE = /^https?:\/\/(www\.)?demetriosbride-bg\.com/i;

/**
 * Route one of our uploaded images through the CDN.
 * @param {string} src    image path or absolute URL
 * @param {number} [width] intended CSS display width; used for ?width= resize
 *                         (doubled for retina, capped). Omit to only swap host
 *                         (Bunny Optimizer still auto-converts to WebP).
 */
export function cdnImage(src, width) {
  if (!CDN_BASE || !src || typeof src !== 'string') return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Normalise to a site-relative path; only rewrite our own uploads.
  const path = src.replace(ORIGIN_RE, '');
  if (!path.startsWith('/wp-content/')) return src;

  let url = CDN_BASE.replace(/\/+$/, '') + path;
  if (width && Number.isFinite(width)) {
    const w = Math.min(Math.round(width * 2), 2000); // retina-aware, capped
    url += (url.includes('?') ? '&' : '?') + 'width=' + w;
  }
  return url;
}
