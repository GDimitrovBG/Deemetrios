// =====================================================
//  SEO HELPERS — computed names, alt text, structured data
//  Based on best practices used by Pronovias, Vera Wang,
//  Justin Alexander, Maggie Sottero and other leading
//  bridal SEO performers.
// =====================================================
import { COLLECTIONS, DRESSES } from './data';
import { SITE_URL, SITE_NAME, DEFAULT_IMG, DEFAULT_DESC } from './seo';

const COLLECTION_LABEL = Object.fromEntries(COLLECTIONS.map(c => [c.id, c.label]));

// Translation strings reused across SEO helpers
const T = {
  bg: {
    bridal:    'Булчинска рокля',
    evening:   'Вечерна рокля',
    detail:    'детайл',
    collection:'колекция',
    salon:     'Арети София',
    book:      'Запази безплатна проба',
  },
  en: {
    bridal:    'Wedding Dress',
    evening:   'Evening Dress',
    detail:    'detail',
    collection:'collection',
    salon:     'Areti Sofia',
    book:      'Book a free fitting',
  },
};

const isEvening = p => p?.collection === 'evening';

// -----------------------------------------------------
//  Display names — keyword-rich, used in H1 and cards
// -----------------------------------------------------

/** Long, keyword-rich heading used as H1 on product pages */
export function getProductHeading(p, lang = 'bg') {
  const t = T[lang] || T.bg;
  const kind = isEvening(p) ? t.evening : t.bridal;
  return `${kind} Style ${p.ref}`;
}

/** Short name for product cards in grids (clean visual) */
export function getProductCardName(p, lang = 'bg') {
  return `Style ${p.ref}`;
}

// -----------------------------------------------------
//  Image alt text — most impactful single change for
//  image SEO. Every image gets a keyword-rich, unique alt.
// -----------------------------------------------------

/**
 * Alt text for a product photo.
 *   idx 0 → primary: "Булчинска рокля Style 1500 — А-силует, колекция Demetrios, бродерия | Арети София"
 *   idx >0 → "Булчинска рокля Style 1500 — детайл 2"
 */
export function getProductAlt(p, lang = 'bg', idx = 0) {
  if (!p) return '';
  const t = T[lang] || T.bg;
  const kind = isEvening(p) ? t.evening : t.bridal;
  const collLabel = COLLECTION_LABEL[p.collection] || '';
  const silhouette = (lang === 'bg' ? p.silhouette : p.silhouette_en) || '';
  const fabric = p.fabric || '';

  if (idx === 0) {
    const parts = [
      `${kind} Style ${p.ref}`,
      silhouette,
      collLabel && `${t.collection} ${collLabel}`,
      fabric.toLowerCase(),
    ].filter(Boolean).join(' — ');
    return `${parts} | ${t.salon}`;
  }
  return `${kind} Style ${p.ref} — ${t.detail} ${idx + 1}`;
}

/** Alt text for accessory photos */
export function getAccessoryAlt(a, lang = 'bg') {
  const t = T[lang] || T.bg;
  const name = lang === 'bg' ? a.name_bg : a.name_en;
  const cat = lang === 'bg' ? a.cat : a.cat_en;
  return `${name} — ${cat} | ${t.salon}`;
}

// -----------------------------------------------------
//  Structured data — richer than baseline
// -----------------------------------------------------

/**
 * Enhanced Product schema. Adds material, color, mpn, sku, brand object,
 * ImageObject array — fields Google uses for product rich results.
 */
export function enhancedProductSchema(p, lang = 'bg') {
  const t = T[lang] || T.bg;
  const collLabel = COLLECTION_LABEL[p.collection] || 'Demetrios';
  const heading = getProductHeading(p, lang);
  const desc = (lang === 'bg' ? p.seo_description_bg : p.seo_description_en) ||
               (lang === 'bg' ? p.description_bg : p.description_en) || DEFAULT_DESC;
  const images = (p.imgs && p.imgs.length ? p.imgs : [p.img]).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": heading,
    "sku": p.ref,
    "mpn": p.ref,
    "image": images,
    "description": desc,
    "category": isEvening(p) ? t.evening : t.bridal,
    "material": p.fabric || undefined,
    "color": "ivory",
    "brand": {
      "@type": "Brand",
      "name": "Demetrios",
    },
    "isRelatedTo": {
      "@type": "ProductCollection",
      "name": collLabel,
    },
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/product/${p.ref}`,
      "priceCurrency": "BGN",
      "price": p.price || 0,
      "priceValidUntil": new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL,
      },
    },
  };
}

/**
 * ItemList schema for collection pages — helps Google understand a list
 * of products on a page and may show carousel-style results.
 */
export function collectionItemListSchema(items, lang = 'bg') {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${SITE_URL}/product/${p.ref}`,
      "name": getProductHeading(p, lang),
      "image": p.imgs?.[0] || p.img,
    })),
  };
}

/** FAQPage schema — used on Booking page (real questions, real answers) */
export function faqSchema(qa) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": qa.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };
}
