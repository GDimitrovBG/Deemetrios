// =====================================================
//  SEO HELPERS — computed names, alt text, structured data
//  Based on best practices used by Pronovias, Vera Wang,
//  Justin Alexander, Maggie Sottero and other leading
//  bridal SEO performers.
// =====================================================
import { COLLECTIONS, DRESSES } from './data';
import { SITE_URL, SITE_NAME, DEFAULT_IMG, DEFAULT_DESC, REVIEW_RATING, REVIEW_COUNT } from './seo';

const COLLECTION_LABEL = Object.fromEntries(COLLECTIONS.map(c => [c.id, c.label]));

// Translation strings reused across SEO helpers
const T = {
  bg: {
    bridal:    'Булчинска рокля',
    evening:   'Официална рокля',
    detail:    'детайл',
    collection:'колекция',
    salon:     'Арети София',
    book:      'Запази безплатна проба',
  },
  en: {
    bridal:    'Wedding Dress',
    evening:   'Formal Dress',
    detail:    'detail',
    collection:'collection',
    salon:     'Areti Sofia',
    book:      'Book a free fitting',
  },
};

const isEvening = p => p?.collection === 'evening';

// -----------------------------------------------------
//  Fabric localisation — the dress data stores fabric names in English
//  ("Beaded tulle, Sparkling tulle"). Showing that raw on the Bulgarian site
//  looks unprofessional and pollutes the BG keyword profile with terms like
//  "tulle"/"embroidery". Translate each comma-separated token for display.
// -----------------------------------------------------
const FABRIC_BG = {
  'tulle': 'тюл',
  'beaded tulle': 'тюл с мъниста',
  'sparkling tulle': 'блестящ тюл',
  'sparkle tulle': 'блестящ тюл',
  'sparkling underlace': 'блестяща подплата',
  'underlace': 'подплата',
  'lace': 'дантела',
  'beaded lace': 'дантела с мъниста',
  'beading': 'мъниста',
  'pearl beading': 'перлени мъниста',
  'overlace': 'горна дантела',
  'embroidery': 'бродерия',
  'satin': 'сатен',
  'mikado': 'микадо',
  'lux mikado': 'луксозно микадо',
  'luxe dupione': 'дюпион',
  'dupione': 'дюпион',
  'chiffon': 'шифон',
  'crepe': 'креп',
  'taffeta': 'тафта',
  'feathers': 'пера',
  'organza': 'органза',
};

/** Translate a comma-separated fabric string for the given language. */
export function localizeFabric(fabric, lang = 'bg') {
  if (!fabric || lang !== 'bg') return fabric || '';
  return fabric
    .split(',')
    .map(part => {
      const key = part.trim().toLowerCase();
      const bg = FABRIC_BG[key];
      // Capitalise the first letter to match the original styling.
      return bg ? bg.charAt(0).toUpperCase() + bg.slice(1) : part.trim();
    })
    .join(', ');
}

// -----------------------------------------------------
//  Unique product descriptions — fixes "crawled, not indexed"
//  Google won't index 100+ pages that share templated text. This
//  generator combines silhouette/fabric/collection/occasion pools,
//  indexed by a deterministic hash of the product ref, so every page
//  reads differently and naturally while staying keyword-relevant.
// -----------------------------------------------------

function refHash(ref) {
  let h = 0;
  const s = String(ref);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (arr, seed) => arr[seed % arr.length];
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const DESC_POOLS = {
  bg: {
    openers: [
      "{KIND} Style {ref} е част от колекция {coll}.",
      "{KIND} Style {ref} носи разпознаваемия почерк на колекция {coll}.",
      "Открийте {kindLower} Style {ref} от колекция {coll}.",
      "{KIND} Style {ref} съчетава майсторска изработка и съвременна естетика — модел от колекция {coll}.",
      "Style {ref} от колекция {coll} е {kindLower}, създадена за неповторим ден.",
      "{KIND} Style {ref} е сред акцентите в колекция {coll}.",
    ],
    silhouette: {
      "А-силует": [
        "Елегантният А-силует се стеснява от талията и пада плавно до пода, подчертавайки фигурата без излишен обем — затова е сред най-търсените силуети при булчинските рокли.",
        "Кройката А-силует ласкае всяка фигура: акцентира талията и създава хармонична, удължена линия, която изглежда естествено и грациозно.",
        "А-силуетът е универсалната класика — мек преход от прилепнал корсаж към разкроена пола, подходящ както за църковна, така и за изнесена церемония.",
      ],
      "Принцеса": [
        "Драматичният принцеса силует съчетава прилепнал корсаж с пищна, обемна пола — визия, създадена за големите, тържествени сватби.",
        "Силуетът принцеса носи приказна осанка: структуриран корсаж и разкошна долна част, които превръщат влизането в залата в момент за помнене.",
        "Класическата принцеса кройка набляга на талията и завършва с богата пола от пластове тюл — въплъщение на романтичната булчинска мечта.",
      ],
      "Русалка": [
        "Чувственият русалски силует прилепва по тялото до коленете и се разтваря в ефектен шлейф — за булки, които искат да подчертаят извивките си.",
        "Кройката русалка следва линиите на тялото и завършва драматично — една от най-фотогеничните визии в съвременната булчинска мода.",
        "Силуетът русалка е смел и женствен избор: прилепнал докрай и финален разкош, който излъчва увереност и стил.",
      ],
    },
    fabric: [
      "Изработена е от {fabric}, които ѝ придават дълбочина и фина текстура.",
      "Моделът е реализиран от {fabric} с внимание към всеки детайл.",
      "{Fabric} оформят роклята и създават нежна игра на светлина по плата.",
      "Богатството на {fabric} личи в ръчно подбраните детайли.",
    ],
    occasion: [
      "Перфектен избор за луксозна сватба в София и за булки, които ценят утвърдена международна марка.",
      "Подходяща за тържествена церемония, на която искате всеки поглед да е към вас.",
      "Чудесен вариант за класическа сватба, както и за по-камерно празненство.",
      "Създадена за булката, която търси баланс между елегантност и индивидуалност.",
      "Идеална за двойки, които мечтаят за стилна и запомняща се сватба.",
    ],
    occasionEvening: [
      "Идеална за абитуриентски бал, официална вечеря или сватба като гостенка.",
      "Чудесен избор за бал, коктейлно парти или специален повод, на който искате да блеснете.",
      "Създадена за вечерните моменти — бал, тържество или официално събитие в София.",
      "Подходяща за абитуриентки и дами, които търсят елегантна официална визия.",
    ],
    closer: [
      "Запазете час за безплатна проба в Арети — официален представител на Demetrios в България от 1992 г.",
      "Пробвайте я лично в салон Арети в София и усетете качеството на Demetrios.",
      "Очакваме ви в Арети за безплатна консултация и проба по предварителен час.",
      "Резервирайте проба в Арети и открийте дали Style {ref} е вашата рокля.",
    ],
  },
  en: {
    openers: [
      "{KIND} Style {ref} is part of the {coll} collection.",
      "{KIND} Style {ref} carries the signature craftsmanship of the {coll} collection.",
      "Discover {kindLower} Style {ref} from the {coll} collection.",
      "{KIND} Style {ref} blends masterful tailoring with modern aesthetics — a {coll} collection design.",
      "Style {ref} from the {coll} collection is a {kindLower} made for an unforgettable day.",
      "{KIND} Style {ref} is among the highlights of the {coll} collection.",
    ],
    silhouette: {
      "A-line": [
        "The elegant A-line tapers from the waist and falls smoothly to the floor, flattering the figure without excess volume — one of the most sought-after bridal silhouettes.",
        "The A-line cut flatters every body type: it accentuates the waist and creates a harmonious, elongated line that looks effortless and graceful.",
        "The A-line is the universal classic — a soft transition from fitted bodice to flared skirt, suited to both church and outdoor ceremonies.",
      ],
      "Ball gown": [
        "The dramatic ball gown silhouette pairs a fitted bodice with a lavish, voluminous skirt — a look made for grand, celebratory weddings.",
        "The ball gown carries a fairytale poise: a structured bodice and opulent skirt that turn your entrance into a moment to remember.",
        "The classic ball gown cut emphasises the waist and finishes in a rich layered-tulle skirt — the embodiment of the romantic bridal dream.",
      ],
      "Mermaid": [
        "The sensual mermaid silhouette hugs the body to the knee then opens into a striking train — for brides who want to accentuate their curves.",
        "The mermaid cut follows the body's lines and finishes dramatically — one of the most photogenic looks in modern bridal fashion.",
        "The mermaid silhouette is a bold, feminine choice: fitted throughout with a final flourish that radiates confidence and style.",
      ],
    },
    fabric: [
      "It is crafted from {fabric}, lending depth and a refined texture.",
      "The gown is realised in {fabric} with attention to every detail.",
      "{Fabric} shape the dress and create a soft play of light across the fabric.",
      "The richness of {fabric} shows in the hand-selected details.",
    ],
    occasion: [
      "A perfect choice for a luxury wedding in Sofia and for brides who value an established international label.",
      "Ideal for a grand ceremony where you want every eye on you.",
      "A wonderful option for a classic wedding as well as a more intimate celebration.",
      "Made for the bride who seeks a balance between elegance and individuality.",
      "Ideal for couples dreaming of a stylish, memorable wedding.",
    ],
    occasionEvening: [
      "Ideal for a prom, a formal dinner or as a wedding guest.",
      "A great choice for a ball, cocktail party or special occasion where you want to shine.",
      "Made for evening moments — a prom, celebration or formal event in Sofia.",
      "Suited to graduates and women seeking an elegant formal look.",
    ],
    closer: [
      "Book a free fitting at Areti — the official Demetrios representative in Bulgaria since 1992.",
      "Try it on in person at the Areti salon in Sofia and feel the Demetrios quality.",
      "We welcome you to Areti for a free consultation and fitting by appointment.",
      "Reserve a fitting at Areti and discover whether Style {ref} is your dress.",
    ],
  },
};

/**
 * Build a unique, keyword-relevant description for a product, deterministically
 * varied by its ref so no two pages share the same text.
 */
export function buildProductDescription(p, lang = 'bg') {
  if (!p) return '';
  const L = DESC_POOLS[lang] || DESC_POOLS.bg;
  const t = T[lang] || T.bg;
  const evening = isEvening(p);
  const kind = evening ? t.evening : t.bridal;
  const coll = COLLECTION_LABEL[p.collection] || 'Demetrios';
  const silKey = (lang === 'bg' ? p.silhouette : p.silhouette_en) || '';
  const fabric = localizeFabric(p.fabric || '', lang).toLowerCase();
  const h = refHash(p.ref);

  const fill = s => s
    .replace(/\{KIND\}/g, kind)
    .replace(/\{kindLower\}/g, kind.toLowerCase())
    .replace(/\{ref\}/g, p.ref)
    .replace(/\{coll\}/g, coll)
    .replace(/\{Fabric\}/g, cap(fabric))
    .replace(/\{fabric\}/g, fabric);

  const parts = [];
  parts.push(fill(pick(L.openers, h)));

  const silPool = L.silhouette[silKey];
  if (silPool) parts.push(fill(pick(silPool, h >>> 3)));

  if (fabric) parts.push(fill(pick(L.fabric, h >>> 5)));

  parts.push(fill(pick(evening ? L.occasionEvening : L.occasion, h >>> 7)));
  parts.push(fill(pick(L.closer, h >>> 9)));

  return parts.join(' ');
}

/**
 * Real, per-product spec rows (silhouette, fabric, collection, brand).
 * Replaces the previous hardcoded spec list that was identical on every page.
 */
export function buildProductSpecs(p, lang = 'bg') {
  if (!p) return [];
  const bg = lang === 'bg';
  const collLabel = COLLECTION_LABEL[p.collection] || 'Demetrios';
  const silhouette = (bg ? p.silhouette : p.silhouette_en) || '';
  const fabric = localizeFabric(p.fabric || '', lang);
  const rows = [
    { label: bg ? 'Силует' : 'Silhouette', value: silhouette },
    fabric ? { label: bg ? 'Тъкан' : 'Fabric', value: fabric } : null,
    { label: bg ? 'Колекция' : 'Collection', value: collLabel },
    { label: bg ? 'Марка' : 'Brand', value: 'Demetrios' },
  ];
  return rows.filter(Boolean);
}

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
  const fabric = localizeFabric(p.fabric || '', lang);

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
  // Use the unique generated description so each Product node differs —
  // identical schema descriptions are a thin-content signal.
  const desc = buildProductDescription(p, lang) ||
               (lang === 'bg' ? p.seo_description_bg : p.seo_description_en) || DEFAULT_DESC;
  const images = (p.imgs && p.imgs.length ? p.imgs : [p.img]).filter(Boolean);

  const schema = {
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
  };
  // Exact prices aren't published — an AggregateOffer price range still lets
  // Google show price info in Product rich results.
  schema.offers = {
    "@type": "AggregateOffer",
    "lowPrice": "1000",
    "highPrice": "4000",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStoreOnly",
  };
  // Google Product rich results require offers, review, OR aggregateRating.
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
