// =====================================================
//  SEO — meta tags, Open Graph, Twitter, JSON-LD helpers
// =====================================================
import { useEffect } from 'react';

const SITE_NAME    = 'Арети — Bridal Couture';
const SITE_URL     = 'https://demetriosbride-bg.com';
const DEFAULT_DESC = 'Арети е официален представител на Demetrios в България. Луксозни булчински рокли, ръчно везане и елитни колекции в сватбения салон в София. Запазете час за проба.';
const DEFAULT_IMG  = 'https://demetriosbride-bg.com/wp-content/uploads/2025/10/булчински-рокли-София1500_1-scaled.jpg';
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
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
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
} = {}) {
  useEffect(() => {
    const finalTitle = title
      ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`)
      : SITE_NAME;
    const finalDesc  = description || DEFAULT_DESC;
    const finalImg   = image || DEFAULT_IMG;
    const finalUrl   = url
      ? (url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`)
      : SITE_URL;
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

    // Canonical
    setLink('canonical', finalUrl);

    // JSON-LD
    setJsonLd(jsonLdId, jsonLd);
  }, [title, description, image, url, type, lang, JSON.stringify(jsonLd), jsonLdId, keywords, noindex]);
}

// =====================================================
//  JSON-LD schema builders
// =====================================================

/** Organization / LocalBusiness schema for the boutique */
export function orgSchema() {
  return {
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
      "postalCode": "1000",
      "addressCountry": "BG",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude":  42.6700,
      "longitude": 23.3200,
    },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "11:00", "closes": "19:00" },
    ],
    "description": DEFAULT_DESC,
    "founder": "Арети",
    "foundingDate": "1992",
    "brand": {
      "@type": "Brand",
      "name": "Demetrios",
    },
    "areaServed": { "@type": "Country", "name": "Bulgaria" },
  };
}

/** Product schema (used on product page) */
export function productSchema(p, lang = 'bg') {
  const name = lang === 'bg' ? (p.name_bg || p.name_en) : (p.name_en || p.name_bg);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "sku":  p.ref,
    "image": p.imgs && p.imgs.length ? p.imgs : [p.img],
    "description": (lang === 'bg' ? p.seo_description_bg : p.seo_description_en) || p.description_bg || DEFAULT_DESC,
    "brand": { "@type": "Brand", "name": "Demetrios" },
    "category": "Булчинска рокля",
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/product/${p.ref}`,
      "priceCurrency": "BGN",
      "price": p.price || 0,
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "Арети — Bridal Couture" },
    },
  };
}

/** Article schema (used on blog post page) */
export function articleSchema(post) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "image": post.image ? [post.image] : [DEFAULT_IMG],
    "datePublished": post.isoDate || post.date,
    "dateModified":  post.isoDate || post.date,
    "author":  { "@type": "Organization", "name": SITE_NAME },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": { "@type": "ImageObject", "url": DEFAULT_IMG },
    },
    "description": post.excerpt || DEFAULT_DESC,
    "articleSection": post.category || "Блог",
    "inLanguage": "bg",
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

/** WebSite schema for home page (enables sitelinks search box) */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url":  SITE_URL,
    "inLanguage": "bg",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export { SITE_NAME, SITE_URL, DEFAULT_DESC, DEFAULT_IMG };
