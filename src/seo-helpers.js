// =====================================================
//  SEO HELPERS — computed names, alt text, structured data
//  Based on best practices used by Pronovias, Vera Wang,
//  Justin Alexander, Maggie Sottero and other leading
//  bridal SEO performers.
// =====================================================
import { COLLECTIONS } from './data';
import { SITE_URL, DEFAULT_DESC } from './seo';

const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map(c => [c.id, c]));
// Language-aware lookup — "Вечерни рокли" must not leak into English copy.
const collLabelById = (id, lang) => collectionLabel(COLLECTION_BY_ID[id], lang);

// Translation strings reused across SEO helpers
const T = {
  bg: {
    bridal:    'Булчинска рокля',
    evening:   'Официална рокля',
    detail:    'детайл',
    collection:'колекция',
    salon:     'Арети София',
    book:      'Запази час за проба',
  },
  en: {
    bridal:    'Wedding Dress',
    evening:   'Formal Dress',
    detail:    'detail',
    collection:'collection',
    salon:     'Areti Sofia',
    book:      'Book a fitting',
  },
  el: {
    bridal:    'Νυφικό',
    evening:   'Βραδινό φόρεμα',
    detail:    'λεπτομέρεια',
    collection:'συλλογή',
    salon:     'Areti Σόφια',
    book:      'Κλείστε ραντεβού',
  },
};

const isEvening = p => p?.collection === 'evening';

/**
 * Display label for a collection in the current language.
 * Most collections are brand names (Cosmobella, Demetrios Platinum…) and are
 * identical in both languages; only "Вечерни рокли" needs a translation, via
 * an optional label_en. Untranslated UI on the /en pages is exactly the
 * "boilerplate-only translation" signal we want to avoid.
 */
export function collectionLabel(c, lang = 'bg') {
  if (!c) return '';
  // Most collections are brand names, identical in every language. Only the
  // "Вечерни рокли" collection has translations (label_en / label_el).
  if (lang === 'el') return c.label_el || c.label_en || c.label;
  if (lang === 'en') return c.label_en || c.label;
  return c.label;
}

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
  // Evening-wear fabrics (Colors Dress / Marsoni styles).
  'jersey': 'жарсе',
  'sequins': 'пайети',
  'beaded mesh': 'тюл с мъниста',
  'glitter mesh': 'блестящ тюл',
  'stretch satin': 'еластичен сатен',
  '3d flowers': '3D цветя',
};

const FABRIC_EL = {
  'tulle': 'τούλι',
  'beaded tulle': 'τούλι με χάντρες',
  'sparkling tulle': 'αστραφτερό τούλι',
  'sparkle tulle': 'αστραφτερό τούλι',
  'sparkling underlace': 'αστραφτερή βάση δαντέλας',
  'underlace': 'βάση δαντέλας',
  'lace': 'δαντέλα',
  'beaded lace': 'δαντέλα με χάντρες',
  'beading': 'χάντρες',
  'pearl beading': 'πέρλες',
  'overlace': 'δαντέλα επένδυσης',
  'embroidery': 'κέντημα',
  'satin': 'σατέν',
  'mikado': 'μικάντο',
  'lux mikado': 'πολυτελές μικάντο',
  'luxe dupione': 'ντουπιόνι',
  'dupione': 'ντουπιόνι',
  'chiffon': 'σιφόν',
  'crepe': 'κρεπ',
  'taffeta': 'ταφτάς',
  'feathers': 'φτερά',
  'organza': 'οργάντζα',
  'jersey': 'ζέρσεϊ',
  'sequins': 'παγιέτες',
  'beaded mesh': 'τούλι με χάντρες',
  'glitter mesh': 'αστραφτερό τούλι',
  'stretch satin': 'ελαστικό σατέν',
  '3d flowers': '3D λουλούδια',
};

/** Translate a comma-separated fabric string for the given language.
 *  English keeps the source English terms; bg and el get their own maps. */
export function localizeFabric(fabric, lang = 'bg') {
  if (!fabric || lang === 'en') return fabric || '';
  const map = lang === 'el' ? FABRIC_EL : FABRIC_BG;
  return fabric
    .split(',')
    .map(part => {
      const key = part.trim().toLowerCase();
      const tr = map[key];
      // Capitalise the first letter to match the original styling.
      return tr ? tr.charAt(0).toUpperCase() + tr.slice(1) : part.trim();
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
    // Evening styles are not Demetrios (Colors Dress / Marsoni), so their
    // closer must not vouch for "Demetrios quality".
    closerEvening: [
      "Запазете час за проба в салон Арети, София — ще я видите на живо и ще получите съвет от стилист.",
      "Пробвайте я лично в Арети — корекциите се правят в собственото ни ателие.",
      "Запазете час и открийте дали Style {ref} е вашата рокля за събитието.",
    ],
    closer: [
      "Запазете час за проба в Арети — официален представител на Demetrios в България от 1992 г.",
      "Пробвайте я лично в салон Арети в София и усетете качеството на Demetrios.",
      "Очакваме ви в Арети за консултация и проба по предварителен час.",
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
    closerEvening: [
      "Book a fitting at the Areti salon in Sofia — see it in person and get a stylist's advice.",
      "Try it on in person at Areti — alterations are done in our own atelier.",
      "Book an appointment and find out whether Style {ref} is your dress for the occasion.",
    ],
    closer: [
      "Book a fitting at Areti — the official Demetrios representative in Bulgaria since 1992.",
      "Try it on in person at the Areti salon in Sofia and feel the Demetrios quality.",
      "We welcome you to Areti for a consultation and fitting by appointment.",
      "Reserve a fitting at Areti and discover whether Style {ref} is your dress.",
    ],
  },
  // Greek pool. Silhouette keys are the ENGLISH silhouette names because el
  // reads p.silhouette_en (there is no silhouette_el on the dress data), the
  // same way the en pool does.
  el: {
    openers: [
      "{KIND} Style {ref} από τη συλλογή {coll}.",
      "{KIND} Style {ref} φέρει την υπογραφή της συλλογής {coll}.",
      "Ανακαλύψτε το {kindLower} Style {ref} από τη συλλογή {coll}.",
      "{KIND} Style {ref} συνδυάζει αριστοτεχνική ραφή και σύγχρονη αισθητική — σχέδιο της συλλογής {coll}.",
      "Το Style {ref} από τη συλλογή {coll} είναι ένα {kindLower} για μια αξέχαστη ημέρα.",
      "{KIND} Style {ref} ξεχωρίζει στη συλλογή {coll}.",
    ],
    silhouette: {
      "A-line": [
        "Η κομψή γραμμή Α στενεύει από τη μέση και πέφτει απαλά ως το πάτωμα, κολακεύοντας τη σιλουέτα χωρίς περιττό όγκο — μία από τις πιο περιζήτητες νυφικές γραμμές.",
        "Η κοπή γραμμή Α κολακεύει κάθε σωματότυπο: τονίζει τη μέση και δημιουργεί μια αρμονική, επιμήκη γραμμή που δείχνει αβίαστη και χαριτωμένη.",
        "Η γραμμή Α είναι η διαχρονική κλασική επιλογή — απαλή μετάβαση από εφαρμοστό μπούστο σε ανοιχτή φούστα, ιδανική για εκκλησία ή υπαίθρια τελετή.",
      ],
      "Ball gown": [
        "Η εντυπωσιακή σιλουέτα μπαλ γκάουν συνδυάζει εφαρμοστό μπούστο με πλούσια, ογκώδη φούστα — μια εμφάνιση για μεγάλους, επίσημους γάμους.",
        "Το μπαλ γκάουν έχει παραμυθένια στάση: δομημένο μπούστο και υπερβολική φούστα που κάνουν την είσοδό σας στιγμή να θυμάστε.",
        "Η κλασική κοπή μπαλ γκάουν τονίζει τη μέση και ολοκληρώνεται σε πλούσια φούστα από στρώσεις τούλι — η ενσάρκωση του ρομαντικού νυφικού ονείρου.",
      ],
      "Mermaid": [
        "Η αισθησιακή σιλουέτα γοργόνα αγκαλιάζει το σώμα ως το γόνατο και ανοίγει σε εντυπωσιακή ουρά — για νύφες που θέλουν να τονίσουν τις καμπύλες τους.",
        "Η κοπή γοργόνα ακολουθεί τις γραμμές του σώματος και ολοκληρώνεται δραματικά — μία από τις πιο φωτογενείς εμφανίσεις στη σύγχρονη νυφική μόδα.",
        "Η σιλουέτα γοργόνα είναι μια τολμηρή, θηλυκή επιλογή: εφαρμοστή παντού με ένα τελικό φινάλε που αποπνέει αυτοπεποίθηση και στιλ.",
      ],
    },
    fabric: [
      "Είναι ραμμένο από {fabric}, που του προσδίδουν βάθος και εκλεπτυσμένη υφή.",
      "Το φόρεμα υλοποιείται σε {fabric} με προσοχή σε κάθε λεπτομέρεια.",
      "{Fabric} διαμορφώνουν το φόρεμα και δημιουργούν ένα απαλό παιχνίδι φωτός.",
      "Ο πλούτος από {fabric} φαίνεται στις επιλεγμένες λεπτομέρειες.",
    ],
    occasion: [
      "Ιδανική επιλογή για έναν πολυτελή γάμο στη Σόφια και για νύφες που εκτιμούν μια καταξιωμένη διεθνή μάρκα.",
      "Κατάλληλο για μια μεγαλοπρεπή τελετή όπου θέλετε όλα τα βλέμματα πάνω σας.",
      "Μια υπέροχη επιλογή τόσο για κλασικό γάμο όσο και για πιο ιδιαίτερη γιορτή.",
      "Δημιουργημένο για τη νύφη που αναζητά ισορροπία ανάμεσα στην κομψότητα και την προσωπικότητα.",
      "Ιδανικό για ζευγάρια που ονειρεύονται έναν κομψό, αξέχαστο γάμο.",
    ],
    occasionEvening: [
      "Ιδανικό για χορό αποφοίτησης, επίσημο δείπνο ή ως καλεσμένη σε γάμο.",
      "Εξαιρετική επιλογή για μπαλ, κοκτέιλ πάρτι ή ειδική περίσταση όπου θέλετε να λάμψετε.",
      "Δημιουργημένο για τις βραδινές στιγμές — χορό, γιορτή ή επίσημη εκδήλωση στη Σόφια.",
      "Κατάλληλο για αποφοίτους και κυρίες που αναζητούν μια κομψή, επίσημη εμφάνιση.",
    ],
    closerEvening: [
      "Κλείστε ραντεβού για πρόβα στην Areti, Σόφια — δείτε το από κοντά με συμβουλή στυλίστριας.",
      "Δοκιμάστε το στην Areti — οι προσαρμογές γίνονται στο δικό μας ατελιέ.",
      "Κλείστε ραντεβού και ανακαλύψτε αν το Style {ref} είναι το φόρεμά σας για την περίσταση.",
    ],
    closer: [
      "Κλείστε ραντεβού για πρόβα στην Areti — επίσημος αντιπρόσωπος της Demetrios στη Βουλγαρία από το 1992.",
      "Δοκιμάστε το από κοντά στο κατάστημα Areti στη Σόφια και νιώστε την ποιότητα Demetrios.",
      "Σας περιμένουμε στην Areti για συμβουλευτική και πρόβα με ραντεβού.",
      "Κλείστε πρόβα στην Areti και ανακαλύψτε αν το Style {ref} είναι το φόρεμά σας.",
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
  const coll = collLabelById(p.collection, lang) || 'Demetrios';
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
  // The silhouette sentences were written for bridal pages; on evening wear
  // the "brides" phrasing contradicts the occasion sentence that follows.
  const deBride = str => evening
    ? str.replace(/за булки/g, 'за дами').replace(/for brides/g, 'for those').replace(/για νύφες/g, 'για όσες')
    : str;
  if (silPool) parts.push(deBride(fill(pick(silPool, h >>> 3))));

  if (fabric) parts.push(fill(pick(L.fabric, h >>> 5)));

  parts.push(fill(pick(evening ? L.occasionEvening : L.occasion, h >>> 7)));
  parts.push(fill(pick((evening && L.closerEvening) || L.closer, h >>> 9)));

  return parts.join(' ');
}

/**
 * Real, per-product spec rows (silhouette, fabric, collection, brand).
 * Replaces the previous hardcoded spec list that was identical on every page.
 */
const SPEC_LABELS = {
  bg: { silhouette: 'Силует', fabric: 'Тъкан', collection: 'Колекция', brand: 'Марка' },
  en: { silhouette: 'Silhouette', fabric: 'Fabric', collection: 'Collection', brand: 'Brand' },
  el: { silhouette: 'Σιλουέτα', fabric: 'Ύφασμα', collection: 'Συλλογή', brand: 'Μάρκα' },
};

export function buildProductSpecs(p, lang = 'bg') {
  if (!p) return [];
  const L = SPEC_LABELS[lang] || SPEC_LABELS.bg;
  const collLabel = collLabelById(p.collection, lang) || 'Demetrios';
  // Show a locale-natural silhouette (capitalised) rather than the raw EN value
  // el/en would otherwise leak.
  const silRaw = silPhrase(p, lang);
  const silhouette = silRaw ? cap(silRaw) : '';
  const fabric = localizeFabric(p.fabric || '', lang);
  const rows = [
    { label: L.silhouette, value: silhouette },
    fabric ? { label: L.fabric, value: fabric } : null,
    { label: L.collection, value: collLabel },
    { label: L.brand, value: p.brand || 'Demetrios' },
  ];
  return rows.filter(Boolean);
}

// -----------------------------------------------------
//  Display names — keyword-rich, used in H1 and cards
// -----------------------------------------------------

// Silhouette wording that reads naturally inside a sentence/title.
// "Булчинска рокля русалка" / "…тип принцеса" mirrors how the silhouette
// landing pages already phrase it.
// Silhouette wording per locale. bg is keyed by the Bulgarian silhouette; en
// and el read p.silhouette_en, so their maps are keyed by the English name.
const SIL_PHRASE = {
  bg: { 'А-силует': 'А-силует', 'Русалка': 'русалка', 'Принцеса': 'принцеса' },
  en: { 'A-line': 'A-line', 'Mermaid': 'mermaid', 'Ball gown': 'ball gown' },
  el: { 'A-line': 'γραμμή Α', 'Mermaid': 'γοργόνα', 'Ball gown': 'μπαλ γκάουν' },
};
/** Raw silhouette value used for `lang` (bg reads the BG field, en/el the EN). */
const silRawFor = (p, lang) => (lang === 'bg' ? p.silhouette : p.silhouette_en) || '';
/** Natural-reading silhouette phrase for `lang`. */
const silPhrase = (p, lang) => {
  const raw = silRawFor(p, lang);
  return (SIL_PHRASE[lang] || SIL_PHRASE.bg)[raw] || raw.toLowerCase();
};

/** Primary (first) fabric only — keeps titles short and scannable. */
function primaryFabric(p, lang = 'bg') {
  const raw = (p.fabric || '').split(',')[0].trim();
  if (!raw) return '';
  return localizeFabric(raw, lang).toLowerCase();
}

/**
 * Title tag for a product page.
 *
 * The stored seo_title_* fields are templated ("Булчинска рокля 1500 |
 * Demetrios | Арети София") — across 111 products they collapse to ~21
 * distinct skeletons that differ only by a style number nobody searches for,
 * which is a thin/near-duplicate signal and a likely cause of "crawled –
 * currently not indexed".
 *
 * Instead we build the title from the attributes people actually search:
 * silhouette + fabric ("булчинска рокля с дантела", "рокля русалка").
 * The ref is kept for uniqueness and for brides comparing Demetrios styles.
 */
export function buildProductTitle(p, lang = 'bg') {
  const t = T[lang] || T.bg;
  const kind = isEvening(p) ? t.evening : t.bridal;
  const sil = silPhrase(p, lang);
  const fabric = primaryFabric(p, lang);

  // BG and EL put the silhouette after the noun ("рокля русалка" / "νυφικό
  // γοργόνα"); EN puts it before ("Mermaid Wedding Dress").
  let base;
  if (lang === 'en') {
    base = [cap(sil), kind].filter(Boolean).join(' ');
    if (fabric) base += ` in ${cap(fabric)}`;
  } else if (lang === 'el') {
    base = [kind, sil].filter(Boolean).join(' ');
    if (fabric) base += ` με ${fabric}`;
  } else {
    base = [kind, sil].filter(Boolean).join(' ');
    // "с сатен" is a spelling error in Bulgarian: before с/з the preposition
    // is "със".
    if (fabric) base += ` ${/^[сз]/i.test(fabric) ? 'със' : 'с'} ${fabric}`;
  }
  base += ` — ${p.ref}`;

  // Keep the whole title inside Google's ~60-char display budget: use the full
  // brand suffix when it fits, the short one when it doesn't.
  const long = `${base} | ${t.salon}`;
  if (long.length <= 60) return long;
  const shortBrand = lang === 'bg' ? 'Арети' : 'Areti';
  return `${base} | ${shortBrand}`;
}

/**
 * Long, keyword-rich heading used as H1 on product pages.
 * Carries the silhouette (the strongest differentiating attribute) while
 * staying short enough for the display typography.
 */
export function getProductHeading(p, lang = 'bg') {
  const t = T[lang] || T.bg;
  const kind = isEvening(p) ? t.evening : t.bridal;
  const sil = silPhrase(p, lang);
  if (!sil) return `${kind} Style ${p.ref}`;
  // Same word-order split as buildProductTitle: bg/el put the silhouette after
  // the noun, en before it.
  return lang === 'en'
    ? `${cap(sil)} ${kind} — Style ${p.ref}`
    : `${kind} ${sil} — Style ${p.ref}`;
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
  const collLabel = collLabelById(p.collection, lang) || '';
  const silRaw = silPhrase(p, lang);
  const silhouette = silRaw ? cap(silRaw) : '';
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

// -----------------------------------------------------
//  Structured data — richer than baseline
// -----------------------------------------------------

/**
 * Enhanced Product schema. Adds material, color, mpn, sku, brand object,
 * ImageObject array — fields Google uses for product rich results.
 */
export function enhancedProductSchema(p, lang = 'bg') {
  const t = T[lang] || T.bg;
  const collLabel = collLabelById(p.collection, lang) || 'Demetrios';
  const heading = getProductHeading(p, lang);
  // Use the unique generated description so each Product node differs —
  // identical schema descriptions are a thin-content signal.
  const desc = buildProductDescription(p, lang) ||
               (lang === 'bg' ? p.seo_description_bg : p.seo_description_en) || DEFAULT_DESC;
  // Schema image URLs must be absolute, and must point at the file the page
  // actually renders — the WebP twin. Listing the .jpg here while the image
  // sitemap lists the .webp gave Google two URLs for one photo and split the
  // signals between them.
  const images = (p.imgs && p.imgs.length ? p.imgs : [p.img])
    .filter(Boolean)
    .map(u => u.replace(/\.jpe?g$/i, '.webp'))
    .map(u => (u.startsWith('/') ? `${SITE_URL}${u}` : u));

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
      "name": p.brand || "Demetrios",
    },
    "isRelatedTo": {
      "@type": "ProductCollection",
      "name": collLabel,
    },
  };
  // Exact per-dress prices aren't published, so this is a range — but it is the
  // range of the collection the dress is actually in, not one blanket
  // 1000-4000 for everything. That blanket figure contradicted the page it sat
  // on: a Platinum gown carried "from €1,000" in its structured data while the
  // visible text on the same site says Platinum starts at €2,500. Structured
  // data disagreeing with the page is exactly what gets a site flagged.
  //
  // Evening wear has no published range anywhere on the site, so it gets an
  // Offer with no price rather than an invented one. Availability is still
  // stated, which is the part that is true for every dress.
  const col = COLLECTIONS.find(c => c.id === p.collection);
  schema.offers = (col && col.priceFrom && col.priceTo)
    ? {
        "@type": "AggregateOffer",
        "lowPrice": String(col.priceFrom),
        "highPrice": String(col.priceTo),
        "priceCurrency": "EUR",
        "offerCount": "1",
        "availability": "https://schema.org/InStoreOnly",
      }
    : {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStoreOnly",
      };
  // No aggregateRating here on purpose. The 266 reviews we have are Google
  // reviews of the SALON, and Google's structured-data policy requires review
  // markup to be about the item it is attached to. Stamping the store's rating
  // onto all 111 individual dresses is exactly the misuse that earns a
  // structured-data manual action, and the AggregateOffer above already
  // satisfies the Product rich-result requirement on its own. The rating stays
  // where it is true: orgSchema() in seo.js.
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
      "image": (() => {
        const u = (p.imgs?.[0] || p.img || '').replace(/\.jpe?g$/i, '.webp');
        return u.startsWith('/') ? `${SITE_URL}${u}` : u;
      })(),
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
