// =====================================================
//  SEO — meta tags, Open Graph, Twitter, JSON-LD helpers
// =====================================================
import { useEffect } from 'react';

const SITE_NAME    = 'Арети — Bridal Couture';
// The brand token appended to page titles that don't already carry one.
// SITE_NAME is 22 characters, which pushed 23 pages past the ~60 Google
// renders before truncating — the tail was the brand, so the salon's own name
// was what got cut. "Арети София" keeps the brand AND the city (a term people
// actually search) in 11 characters.
const TITLE_BRAND  = 'Арети София';
const SITE_URL     = 'https://demetriosbride-bg.com';
const DEFAULT_DESC = 'Арети е официален представител на Demetrios в България. Луксозни булчински рокли, ръчно везане и елитни колекции в сватбения салон в София. Запазете час за проба.';
const DEFAULT_IMG  = 'https://demetriosbride-bg.com/wp-content/uploads/2025/10/булчински-рокли-София1500_1-scaled.webp';
const DEFAULT_LOCALE = 'bg_BG';

// ---- Mutation helpers --------------------------------
function setMeta(attr, name, content) {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
function setLink(rel, href) {
  if (href === null) {
    const el = document.head.querySelector(`link[rel="${rel}"]`);
    if (el) el.remove();
    return;
  }
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}
/**
 * Declare the bg ↔ en pair for this page.
 *
 * `alternates` is { bg: '/path', en: '/en/path' }. Both entries must be
 * present and each page must reference itself, otherwise Google discards the
 * whole cluster. Pass null for pages that exist in one language only (the
 * blog), which simply clears any stale tags.
 */
function setHreflangs(alternates) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
  if (!alternates) return;
  const add = (hreflang, href) => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', href.startsWith('http') ? href : `${SITE_URL}${href}`);
    document.head.appendChild(el);
  };
  if (alternates.bg) add('bg', alternates.bg);
  if (alternates.en) add('en', alternates.en);
  // Bulgarian is the default/fallback locale for everyone else.
  if (alternates.bg) add('x-default', alternates.bg);
}
function setJsonLd(id, data) {
  // remove existing
  const old = document.head.querySelector(`script[type="application/ld+json"][data-id="${id}"]`);
  if (old) old.remove();
  if (!data) return;
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute('data-id', id);
  s.text = JSON.stringify(data);
  document.head.appendChild(s);
}

/**
 * useSeo — manage <head> for the current route.
 *
 * @param {Object}  opts
 * @param {string}  opts.title        — page title (full, will be set as-is)
 * @param {string}  opts.description  — meta description
 * @param {string}  opts.image        — OG/Twitter image (absolute URL)
 * @param {string}  opts.url          — canonical URL (path or full)
 * @param {string}  opts.type         — OG type (website|article|product)
 * @param {string}  opts.lang         — page language (bg|en)
 * @param {Object}  opts.jsonLd       — JSON-LD schema object (or null)
 * @param {string}  opts.jsonLdId     — id for JSON-LD tag (default 'main')
 * @param {string}  opts.keywords     — meta keywords (optional)
 * @param {boolean} opts.noindex      — set robots noindex,nofollow
 */
export function useSeo({
  title,
  description,
  image,
  url,
  type = 'website',
  lang = 'bg',
  jsonLd = null,
  jsonLdId = 'main',
  keywords,
  noindex = false,
  alternates = null,
} = {}) {
  useEffect(() => {
    // Only append the site name when the title doesn't already carry the brand.
    // Product/category titles end in "Арети София" / "Areti Sofia" — appending the
    // full SITE_NAME there produced a double-"Арети" 90+ char title. Detect the
    // brand token (any case/locale) and skip the suffix in that case.
    const hasBrand = title && /Арети|Areti/i.test(title);
    const finalTitle = title
      ? (hasBrand ? title : `${title} | ${TITLE_BRAND}`)
      : SITE_NAME;
    const finalDesc  = description || DEFAULT_DESC;
    // og:image / twitter:image must be ABSOLUTE URLs (Facebook & Twitter reject
    // relative paths). Our uploads also have WebP twins — prefer those.
    let finalImg = image || DEFAULT_IMG;
    if (finalImg.startsWith('/')) finalImg = `${SITE_URL}${finalImg}`;
    finalImg = finalImg.replace(/^https?:\/\/(www\.)?demetriosbride-bg\.com(\/wp-content\/[^?]*)\.jpe?g/i, `${SITE_URL}$2.webp`);
    // ---- Locale-aware canonical + hreflang -------------------------------
    // Callers pass `url` as the BULGARIAN path (e.g. "/collection"); the /en
    // prefix is applied here so no page component has to know about locales.
    let bgPath = url && !url.startsWith('http')
      ? (url.startsWith('/') ? url : `/${url}`)
      : (url ? url.replace(/^https?:\/\/[^/]+/, '') || '/' : '/');
    if (bgPath !== '/' && bgPath.endsWith('/')) bgPath = bgPath.slice(0, -1);

    // Blog POSTS default to Bulgarian-only (translated ones opt in by passing
    // explicit `alternates`). The /blog LISTING is bilingual — /en/blog lists
    // the translated posts.
    const bgOnly = /^\/blog\//.test(bgPath);
    // The English home is '/en/' WITH the trailing slash: the server issues a
    // 301 from /en to /en/, and an hreflang target or sitemap entry that
    // redirects is discarded by Google (it wants a 200 that self-canonicalises).
    // Every other path stays slash-less, matching the rest of the site.
    const enPath = bgPath === '/' ? '/en/' : `/en${bgPath}`;
    const localePath = (lang === 'en' && (!bgOnly || alternates)) ? enPath : bgPath;
    const finalUrl = `${SITE_URL}${localePath === '/' ? '/' : localePath}`;

    // Reciprocal, self-referencing pair (Google drops one-directional sets).
    // Suppressed on noindex pages, which have nothing to cluster.
    const finalAlternates = alternates !== null ? alternates
      : (bgOnly || noindex) ? null
      : { bg: bgPath, en: enPath };
    const finalLocale = lang === 'en' ? 'en_US' : DEFAULT_LOCALE;

    document.title = finalTitle;
    document.documentElement.lang = lang;

    // Standard meta
    setMeta('name', 'description', finalDesc);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setMeta('name', 'author', SITE_NAME);

    // Open Graph
    setMeta('property', 'og:title',       finalTitle);
    setMeta('property', 'og:description', finalDesc);
    setMeta('property', 'og:type',        type);
    setMeta('property', 'og:url',         finalUrl);
    setMeta('property', 'og:image',       finalImg);
    setMeta('property', 'og:site_name',   SITE_NAME);
    setMeta('property', 'og:locale',      finalLocale);

    // Twitter
    setMeta('name', 'twitter:card',        'summary_large_image');
    setMeta('name', 'twitter:title',       finalTitle);
    setMeta('name', 'twitter:description', finalDesc);
    setMeta('name', 'twitter:image',       finalImg);

    // Canonical. Omitted on noindex pages: the 404 shell (dist/404.html) is
    // served under many different URLs, so a baked-in canonical there would
    // point every unknown URL at the home page.
    setLink('canonical', noindex ? null : finalUrl);

    setHreflangs(finalAlternates);

    // JSON-LD
    setJsonLd(jsonLdId, jsonLd);

    // Prerender signal — tells the build-time crawler the head is fully set.
    document.documentElement.setAttribute('data-seo-ready', '1');
  }, [title, description, image, url, type, lang, JSON.stringify(jsonLd), jsonLdId, keywords, noindex, JSON.stringify(alternates)]);
}

// =====================================================
//  JSON-LD schema builders
// =====================================================

// ── Google Reviews — update these when the numbers change ─────────────────
// Set REVIEW_COUNT=0 to omit AggregateRating from schema entirely.
export const REVIEW_RATING = 4.8;
export const REVIEW_COUNT  = 266; // Google reviews — update when count changes

/** Organization / LocalBusiness schema for the boutique */
export function orgSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "Арети — Bridal Couture",
    "alternateName": "Areti Wedding Salon",
    "image": DEFAULT_IMG,
    "url": SITE_URL,
    "telephone": "+359 878 521 660",
    "email": "info@areti.bg",
    "priceRange": "€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Крум Попов 63",
      "addressLocality": "София",
      "addressRegion": "София-град",
      "postalCode": "1421",
      "addressCountry": "BG",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude":  42.6819,
      "longitude": 23.3192,
    },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "10:00", "closes": "19:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "10:30", "closes": "18:00" },
    ],
    "description": DEFAULT_DESC,
    "founder": "Арети",
    "foundingDate": "1992",
    "brand": { "@type": "Brand", "name": "Demetrios" },
    "areaServed": { "@type": "Country", "name": "Bulgaria" },
    "sameAs": [
      "https://www.facebook.com/areti.bg/",
      "https://www.instagram.com/aretiweddingsalon/",
      "https://www.tiktok.com/@aretiwedding",
    ],
    // speakable tells AI/voice assistants which sections to read aloud / cite
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".lede", ".org-desc"],
    },
    "hasMap": "https://maps.google.com/?q=ул.+Крум+Попов+63,+Лозенец,+София",
    "knowsAbout": ["Булчински рокли", "Demetrios", "Сватбени рокли", "Вечерни рокли", "Bridal couture"],
    "slogan": "Официален представител на Demetrios в България от 1992 г.",
  };
  if (REVIEW_COUNT > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": REVIEW_RATING,
      "reviewCount": REVIEW_COUNT,
      "bestRating": "5",
      "worstRating": "1",
    };
  }
  return schema;
}

/** Canonical path for a blog post — prefers SEO slug, falls back to numeric id */
export function blogPostPath(post) {
  return post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`;
}

/** Article schema (used on blog post page) */
export function articleSchema(post, lang = 'bg') {
  const path = blogPostPath(post);
  const url = `${SITE_URL}${lang === 'en' && post.title_en ? `/en${path}` : path}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    // Point at the WebP twin the page actually renders, matching the sitemap.
    "image": post.image
      ? [(u => u.startsWith('/') ? `${SITE_URL}${u}` : u)(post.image.replace(/\.jpe?g$/i, '.webp'))]
      : [DEFAULT_IMG],
    "datePublished": post.isoDate || post.date,
    "dateModified":  post.isoDate || post.date,
    "author": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
      "logo": { "@type": "ImageObject", "url": DEFAULT_IMG },
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL,
      "logo": { "@type": "ImageObject", "url": DEFAULT_IMG, "width": 1200, "height": 630 },
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "description": post.excerpt || DEFAULT_DESC,
    "articleSection": post.category || "Блог",
    "inLanguage": lang,
    "url": url,
    "keywords": lang === 'bg'
      ? "булчински рокли, сватбени рокли, Demetrios, Арети София"
      : "wedding dresses, bridal gowns, Demetrios, Areti Sofia",
  };
}

/** Breadcrumb schema */
export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": it.name,
      "item": `${SITE_URL}${it.url}`,
    })),
  };
}

/** WebSite schema for home page */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "alternateName": "Areti Wedding Salon",
    "url":  SITE_URL,
    "inLanguage": "bg",
    "publisher": { "@type": "Organization", "name": SITE_NAME, "url": SITE_URL },
  };
}

/** FAQPage schema */
export function faqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };
}

export { SITE_NAME, SITE_URL, DEFAULT_DESC, DEFAULT_IMG };
