import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import i18n from './i18n';
import { IMG, DRESSES, ACCESSORIES, COLLECTIONS } from './data';
import { Img } from './components';
import { DressCard } from './home';
import { useSeo, productSchema, breadcrumbSchema, faqSchema, blogPostPath } from './seo';
import { BLOG_POSTS } from './blog_data';
import { getProductHeading, getProductAlt, getAccessoryAlt, enhancedProductSchema, collectionItemListSchema, localizeFabric, buildProductDescription, buildProductSpecs } from './seo-helpers';

// =====================================================
//  CATALOG: Collection grid, Product detail, Accessories
// =====================================================

function FilterPanel({ t, lang, filters, setFilters, onClose }) {
  const tg = t.collection.groups;
  const togglePill = (group, val) => {
    const cur = filters[group] || [];
    setFilters({ ...filters, [group]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };
  return (
    <div className="filter-panel">
      <div className="inner">
        <div>
          <h5>{tg.silhouette}</h5>
          <div className="filter-options">
            {t.collection.silhouettes.map(s => (
              <span key={s} className={`filter-pill ${(filters.silhouette || []).includes(s) ? "on" : ""}`} onClick={() => togglePill("silhouette", s)}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <h5>{tg.fabric}</h5>
          <div className="filter-options">
            {t.collection.fabrics.map(s => (
              <span key={s} className={`filter-pill ${(filters.fabric || []).includes(s) ? "on" : ""}`} onClick={() => togglePill("fabric", s)}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <h5>{tg.neckline}</h5>
          <div className="filter-options">
            {t.collection.necklines.map(s => (
              <span key={s} className={`filter-pill ${(filters.neckline || []).includes(s) ? "on" : ""}`} onClick={() => togglePill("neckline", s)}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function applyFiltersAndSort(list, filters, sortBy) {
  let result = [...list];
  const sf = filters.silhouette || [];
  if (sf.length) result = result.filter(d => sf.includes(d.silhouette));
  return result;
}

const SILHOUETTE_KEY = {
  "А-силует": "aline", "Прав": "column", "Принцеса": "ballgown", "Сирена": "mermaid", "Балон": "ballgown", "Ампир": "empire",
  "A-line": "aline", "Column": "column", "Ball Gown": "ballgown", "Mermaid": "mermaid", "Empire": "empire",
};

const COLLECTION_FAQ = {
  bg: [
    { q: "Колко струват булчинските рокли в Арети?", a: "Цените на булчинските рокли в Арети варират в зависимост от колекцията: Cosmobella от 1 000 до 1 800 €, Demetrios от 1 500 до 2 800 €, Destination Romance от 1 200 до 2 000 €, а Demetrios Platinum — от 2 500 до 4 000 €. В цената са включени безплатна консултация с личен стилист и една безплатна корекция." },
    { q: "Какви силуети булчински рокли предлагате?", a: "В салона в София разполагаме с над 100 рокли в 5 основни силуета: А-силует (универсален и флатериращ), русалка (подчертава извивките), принцеса (обемна пола с корсет), права линия (елегантен минимализъм) и бохо (леки материи и свободни кройки). Всеки силует е достъпен в различни тъкани — от дантела и тюл до коприна и сатен." },
    { q: "Кога да започна търсенето на сватбена рокля?", a: "Препоръчваме да започнете 8 до 12 месеца преди сватбата. Ако избраната рокля не е налична в шоурума, поръчката от Demetrios отнема 3–4 месеца, плюс 1–2 месеца за корекции. За по-спешни случаи имаме рокли в наличност, които могат да бъдат коригирани за 2–3 седмици." },
    { q: "Предлагате ли достъпни булчински рокли?", a: "Да. Колекцията Cosmobella предлага елегантни булчински рокли от 1 000 €, а Destination Romance — леки рокли за дестинационни сватби от 1 200 €. Периодично организираме и намаления на модели от предишни сезони. Всички рокли са оригинални Demetrios с гаранция за качество." },
    { q: "Какво включва пробата на булчинска рокля?", a: "Пробата трае около 60–90 минути и включва: лична консултация със стилист, който подбира рокли по вашата фигура и предпочитания; проба на неограничен брой модели от всички колекции; съвети за аксесоари и воал. Пробата е безплатна и по предварителен час." },
    { q: "Мога ли да поръчам рокля, която не е в шоурума?", a: "Да. Като официален представител на Demetrios в България, можем да поръчаме всеки модел от текущите колекции, включително Demetrios, Cosmobella, Platinum и Destination Romance. Доставката отнема 3–4 месеца. Показваме ви каталозите и мострените тъкани на място." },
    { q: "Правите ли корекции на роклята?", a: "Да. В ателието работи Кети — шивачка с многогодишен опит в булчинска мода. Една безплатна корекция е включена в цената на всяка рокля. Корекциите включват скъсяване, стесняване, добавяне на подплати или промяна на деколтето. Отнема 1–2 седмици." },
    { q: "Колко рокли мога да пробвам на една среща?", a: "Няма ограничение — можете да пробвате толкова рокли, колкото желаете. Стилистът подбира 5–8 модела въз основа на вашите предпочитания, но ако харесате и други, ги добавяме без проблем. Средно булките пробват 6–10 рокли преди да направят своя избор." },
    { q: "Давате ли булчински рокли под наем?", a: "Арети е салон за продажба на оригинални булчински рокли Demetrios, а не под наем. Вярваме, че роклята за най-важния ден трябва да е само ваша — ушита по вашата фигура и съхранена като спомен. За булки с по-ограничен бюджет предлагаме достъпната колекция Cosmobella от 1 000 € и периодични намаления на модели от предишни сезони, които често излизат по-изгодно от наема." },
  ],
  en: [
    { q: "How much do wedding dresses cost at Areti?", a: "Prices vary by collection: Cosmobella from €1,000 to €1,800, Demetrios from €1,500 to €2,800, Destination Romance from €1,200 to €2,000, and Demetrios Platinum from €2,500 to €4,000. A free consultation and one alteration are included." },
    { q: "What silhouettes do you offer?", a: "We carry over 100 dresses in 5 silhouettes: A-line, mermaid, ball gown, column and boho. Each is available in various fabrics including lace, tulle, silk and satin." },
    { q: "When should I start looking for a wedding dress?", a: "We recommend starting 8–12 months before the wedding. Custom orders from Demetrios take 3–4 months, plus 1–2 months for alterations. For urgent timelines, we have in-stock dresses that can be altered within 2–3 weeks." },
    { q: "Do you offer affordable wedding dresses?", a: "Yes. Cosmobella starts from €1,000, and Destination Romance from €1,200. We also run seasonal sales on previous-season styles. All dresses are original Demetrios with a quality guarantee." },
    { q: "What does a fitting appointment include?", a: "A 60–90 minute session with a personal stylist who selects gowns based on your figure and preferences. You can try an unlimited number of dresses. The appointment is free and by reservation." },
    { q: "Can I order a dress not in the showroom?", a: "Yes. As the official Demetrios representative in Bulgaria, we can order any current-season style. Delivery takes 3–4 months. We show you the full catalogue and fabric swatches in the salon." },
    { q: "Do you offer alterations?", a: "Yes. Our in-house seamstress Keti specializes in bridal alterations. One free alteration is included with every dress. Turnaround is 1–2 weeks." },
    { q: "How many dresses can I try on?", a: "There's no limit. Our stylist pre-selects 5–8 gowns based on your preferences, but you can add more. Most brides try 6–10 before making their choice." },
    { q: "Do you rent wedding dresses?", a: "Areti sells original Demetrios wedding dresses rather than renting. We believe the dress for your most important day should be yours alone — tailored to your figure and kept as a keepsake. For brides on a tighter budget, our Cosmobella collection starts from €1,000, and seasonal sales on previous-season styles often work out cheaper than renting." },
  ],
};

const SILHOUETTE_INFO = {
  bg: {
    aline:    { name: "А-силует", desc: "Универсалният избор — стеснява се от рамената и се разширява плавно от талията. Подходящ за всеки тип фигура. Подчертава талията, скрива бедрата и създава елегантен, хармоничен силует." },
    mermaid:  { name: "Русалка", desc: "Прилепва тялото до коленете и се разширява драматично. Перфектен за булки, които искат да подчертаят извивките си. Изисква увереност и е зашеметяващ на снимки." },
    ballgown: { name: "Принцеса", desc: "Класическата приказна рокля — прилепнал корсет и обемна пола. Създава впечатляващ ефект при влизане в залата. Идеален за голяма сватба в хотел или църква." },
    column:   { name: "Права линия", desc: "Елегантен минимализъм — следва контурите на тялото без излишен обем. Модерен и изтънчен избор за булки с висока фигура или за градска/дестинационна сватба." },
    empire:   { name: "Бохо", desc: "Свободни, леки тъкани и романтична естетика. Лека и удобна кройка, подходяща за сватби на открито, на плаж или в природата. Често с флорални елементи и мека дантела." },
  },
  en: {
    aline:    { name: "A-line", desc: "The universal choice — narrows at the shoulders and flows from the waist. Flattering on every body type, it emphasizes the waist and creates an elegant silhouette." },
    mermaid:  { name: "Mermaid", desc: "Hugs the body to the knees and flares dramatically. Perfect for brides who want to accentuate their curves." },
    ballgown: { name: "Ball gown", desc: "The classic fairytale dress — fitted bodice with a voluminous skirt. Ideal for grand venues and big celebrations." },
    column:   { name: "Column", desc: "Elegant minimalism that follows the body's contours. A modern, refined choice for tall brides or destination weddings." },
    empire:   { name: "Boho", desc: "Light, flowing fabrics with romantic aesthetics. Comfortable and perfect for outdoor, beach or garden weddings." },
  },
};

function CollectionSeoContent({ lang, setRoute }) {
  const isBg = lang === "bg";
  const faq = COLLECTION_FAQ[lang] || COLLECTION_FAQ.bg;
  const sil = SILHOUETTE_INFO[lang] || SILHOUETTE_INFO.bg;
  const [faqOpen, setFaqOpen] = useState({});

  const silCounts = useMemo(() => {
    const counts = {};
    DRESSES.filter(d => d.collection !== "evening").forEach(d => {
      const key = SILHOUETTE_KEY[d.silhouette] || "other";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <section className="collection-seo" style={{ maxWidth: 820, margin: "0 auto", padding: "64px 24px 0" }}>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? "Булчински рокли — наръчник по силуети" : "Wedding dresses — silhouette guide"}
      </h2>
      <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", marginBottom: 32 }}>
        {isBg
          ? "Изборът на силует е първата и най-важна стъпка. Ето кратък наръчник за петте основни типа булчински рокли, които ще намерите в нашия салон."
          : "Choosing the right silhouette is the first and most important step. Here's a quick guide to the five main types of wedding dresses in our salon."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 48 }}>
        {Object.entries(sil).map(([key, { name, desc }]) => (
          <div key={key} style={{ borderTop: "2px solid var(--champagne-deep)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <h3 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 400 }}>{name}</h3>
              <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>{silCounts[key] || 0} {isBg ? "модела" : "styles"}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? "Цени на булчинските рокли" : "Wedding dress prices"}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 24 }}>
        {isBg
          ? "Цените в Арети зависят от колекцията и сложността на изработката. Всички рокли са оригинални Demetrios — с международна гаранция за качество. В цената е включена безплатна консултация и една корекция."
          : "Prices at Areti depend on the collection and craftsmanship. All dresses are original Demetrios with an international quality guarantee. A free consultation and one alteration are included."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 48 }}>
        {[
          { label: "Cosmobella", range: "1 000 – 1 800 €" },
          { label: "Demetrios", range: "1 500 – 2 800 €" },
          { label: "Destination Romance", range: "1 200 – 2 000 €" },
          { label: "Demetrios Platinum", range: "2 500 – 4 000 €" },
        ].map(c => (
          <div key={c.label} style={{ background: "var(--surface)", padding: "16px 20px", borderRadius: 8 }}>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 16 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>{c.range}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? "Как да изберете булчинска рокля" : "How to choose a wedding dress"}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 12 }}>
        {isBg
          ? "Изборът на булчинска рокля е едно от най-вълнуващите решения преди сватбата. Препоръчваме да започнете 8–12 месеца предварително — така имате достатъчно време за поръчка по ваш размер и корекции. Запишете се за проба и нашият стилист ще подбере модели, подходящи за вашата фигура, стил и бюджет."
          : "Choosing a wedding dress is one of the most exciting decisions before the wedding. We recommend starting 8–12 months ahead — this gives enough time for custom orders and alterations. Book a fitting and our stylist will select dresses suited to your figure, style and budget."}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 12 }}>
        {isBg
          ? "В Арети разполагаме с над 100 рокли на място в 5 силуета и от 4 колекции на Demetrios. Можете да пробвате неограничен брой модели. Нашата шивачка Кети извършва всички корекции на място — от промяна на дължината до пълна промяна на деколтето."
          : "At Areti we have over 100 dresses on-site in 5 silhouettes from 4 Demetrios collections. You can try an unlimited number of styles. Our seamstress Keti handles all alterations in-house — from hemming to full neckline modifications."}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button className="btn btn-solid" onClick={() => setRoute("booking")}>
          {isBg ? "Запази час за проба →" : "Book a fitting →"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48, fontSize: 14 }}>
        <a href="/blog/svatbeni-rokli-kak-da-namerite-perfektnata" onClick={e => { e.preventDefault(); setRoute("blog/svatbeni-rokli-kak-da-namerite-perfektnata"); }} style={{ color: "var(--ink-soft)" }}>
          {isBg ? "Пълен наръчник за избор →" : "Full buying guide →"}
        </a>
        <a href="/blog/bulchinski-rokli-tseni-2026" onClick={e => { e.preventDefault(); setRoute("blog/bulchinski-rokli-tseni-2026"); }} style={{ color: "var(--ink-soft)" }}>
          {isBg ? "Цени 2026 →" : "Prices 2026 →"}
        </a>
        <a href="/blog/bulchinska-roklia-silueti-narachnik" onClick={e => { e.preventDefault(); setRoute("blog/bulchinska-roklia-silueti-narachnik"); }} style={{ color: "var(--ink-soft)" }}>
          {isBg ? "Наръчник по силуети →" : "Silhouette guide →"}
        </a>
      </div>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 20 }}>
        {isBg ? "Често задавани въпроси" : "Frequently asked questions"}
      </h2>
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        {faq.map((item, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--rule)" }}>
            <button
              onClick={() => setFaqOpen(prev => ({ ...prev, [i]: !prev[i] }))}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                padding: "16px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                fontFamily: "var(--f-sans)", fontSize: 15, fontWeight: 500, color: "var(--ink)",
              }}
            >
              <span>{item.q}</span>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginLeft: 12, color: "var(--ink-mute)", transition: "transform 0.2s", transform: faqOpen[i] ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            <div style={{ maxHeight: faqOpen[i] ? 500 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)", padding: "0 0 16px" }}>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SUB_COLLECTION_SEO = {
  bg: {
    cosmobella: { heading: "Булчински рокли Cosmobella", price: "1 000 – 1 800 €", text: "Cosmobella е достъпната линия на Demetrios — романтични силуети с флорални апликации, илюзорни деколтета и деликатни презрамки. Идеална за булки, които търсят качество и елегантност на разумна цена. Всички рокли са оригинални, с международна гаранция." },
    demetrios: { heading: "Булчински рокли Demetrios", price: "1 500 – 2 800 €", text: "Основната колекция Demetrios предлага пълния спектър от силуети — А-силует, русалка и принцеса. Съвременни дизайни с дантела, бродерия и тюл с мъниста. Водещата линия на бранда с над 40 години традиция в булчинската мода." },
    platinum: { heading: "Луксозни булчински рокли Demetrios Platinum", price: "2 500 – 4 000 €", text: "Demetrios Platinum е ексклузивната линия за булки, които не правят компромиси. Ръчно апликирани кристали Swarovski, перли и луксозни европейски дантели. Всеки модел изисква над 200 часа ръчна работа — истинско произведение на изкуството." },
    destination: { heading: "Сватбени рокли Destination Romance", price: "1 200 – 2 000 €", text: "Destination Romance е създадена за дестинационни сватби — на плаж, в градина или на открито. Леки тъкани, къси шлейфове и бохо естетика. Удобни и красиви рокли, които се пътуват лесно и изглеждат зашеметяващо под слънцето." },
    evening: { heading: "Официални, бални и абитуриентски рокли в София", price: "по запитване", text: "Освен булчински рокли, Арети предлага и официални вечерни рокли за специални поводи — абитуриентски бал, сватба като гостенка, кръщене или коктейлно парти. Елегантни абитуриентски рокли и бални рокли в София с богат избор от силуети, цветове и тъкани. Запазете час за проба и нашият стилист ще ви помогне да изберете перфектната рокля за вашето събитие." },
  },
  en: {
    cosmobella: { heading: "Cosmobella Wedding Dresses", price: "€1,000 – €1,800", text: "Cosmobella is the accessible Demetrios line — romantic silhouettes with floral appliqués, illusion necklines and delicate straps. Perfect for brides seeking quality and elegance at a reasonable price. All dresses are original with an international guarantee." },
    demetrios: { heading: "Demetrios Wedding Dresses", price: "€1,500 – €2,800", text: "The core Demetrios collection offers the full range of silhouettes — A-line, mermaid and ball gown. Contemporary designs in lace, embroidery and beaded tulle. The brand's flagship line with over 40 years of bridal tradition." },
    platinum: { heading: "Luxury Demetrios Platinum Wedding Dresses", price: "€2,500 – €4,000", text: "Demetrios Platinum is the exclusive line for brides who don't compromise. Hand-applied Swarovski crystals, pearls and luxurious European lace. Each gown requires over 200 hours of handwork — a true work of art." },
    destination: { heading: "Destination Romance Wedding Dresses", price: "€1,200 – €2,000", text: "Destination Romance is designed for destination weddings — beach, garden or outdoor. Lightweight fabrics, short trains and boho aesthetics. Comfortable and beautiful gowns that travel easily." },
    evening: { heading: "Evening, Prom & Formal Dresses in Sofia", price: "on request", text: "Beyond wedding gowns, Areti offers formal evening dresses for special occasions — proms, wedding guests, christenings and cocktail parties. Elegant prom and ball dresses in Sofia with a wide selection of silhouettes, colours and fabrics. Book a fitting and our stylist will help you find the perfect dress for your event." },
  },
};

function SubCollectionSeo({ lang, setRoute, colId }) {
  const isBg = lang === "bg";
  const info = (SUB_COLLECTION_SEO[lang] || SUB_COLLECTION_SEO.bg)[colId];
  if (!info) return null;
  const count = DRESSES.filter(d => d.collection === colId).length;

  return (
    <section style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 0" }}>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {info.heading}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 16 }}>{info.text}</p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, fontSize: 14, color: "var(--ink-mute)" }}>
        <span>{isBg ? `${count} модела в салона` : `${count} styles in store`}</span>
        <span>{isBg ? `Цени: ${info.price}` : `Prices: ${info.price}`}</span>
        <span>{isBg ? "Безплатна проба и корекция" : "Free fitting & alteration"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-solid" onClick={() => setRoute("booking")}>
          {isBg ? "Запази проба →" : "Book a fitting →"}
        </button>
        <button className="btn" onClick={() => setRoute("collection")}>
          {isBg ? "Всички колекции" : "All collections"}
        </button>
      </div>
    </section>
  );
}

function CollectionPage({ lang, setRoute, initCollection = null, favorites = [], toggleFavorite, goProduct }) {
  const t = i18n[lang];
  const isBg = lang === "bg";
  const colData = initCollection ? COLLECTIONS.find(c => c.id === initCollection) : null;
  const isEvening = initCollection === "evening";
  useSeo({
    title: isEvening
      ? (isBg ? "Официални, бални и абитуриентски рокли в София | Арети" : "Evening, Prom & Formal Dresses in Sofia | Areti")
      : colData
        ? (isBg ? `Луксозни булчински рокли ${colData.label} в София | Арети` : `Luxury ${colData.label} Wedding Dresses in Sofia | Areti`)
        : (isBg ? "Луксозни булчински и сватбени рокли в София | Арети" : "Luxury Wedding & Bridal Dresses in Sofia | Areti"),
    description: isEvening
      ? (isBg
          ? "Официални, бални и абитуриентски рокли в София от Арети. Елегантни вечерни рокли за бал, сватба или коктейл — проба по предварителен час."
          : "Evening, prom and formal dresses in Sofia by Areti. Elegant gowns for proms, weddings and cocktail events — fittings by appointment.")
      : colData
        ? (isBg ? (colData.seo_desc_bg || colData.desc_bg) : (colData.seo_desc_en || colData.desc_en))
        : (isBg
            ? "Над 100 луксозни булчински рокли в София — цени от 1 000 до 4 000 €. Колекции Demetrios, Cosmobella, Platinum и Destination Romance. 5 силуета, безплатни корекции. Арети — от 1992 г."
            : "Over 100 luxury wedding dresses in Sofia — prices from €1,000 to €4,000. Demetrios, Cosmobella, Platinum and Destination Romance collections. 5 silhouettes, free alterations. Areti — since 1992."),
    image: DRESSES[0]?.imgs?.[0] || DRESSES[0]?.img,
    url: initCollection ? `/collection/${initCollection}` : "/collection",
    lang,
    keywords: "колекции булчински рокли, Demetrios, Cosmobella, Platinum, Destination Romance, сватбени рокли София",
    jsonLd: { "@graph": [
      breadcrumbSchema([
        { name: isBg ? "Начало" : "Home", url: "/" },
        { name: isBg ? "Колекция" : "Collection", url: "/collection" },
        ...(colData ? [{ name: colData.label, url: `/collection/${colData.id}` }] : []),
      ]),
      collectionItemListSchema(
        (initCollection ? DRESSES.filter(d => d.collection === initCollection) : DRESSES),
        lang,
      ),
      ...(!initCollection ? [faqSchema(COLLECTION_FAQ[lang] || COLLECTION_FAQ.bg)] : []),
    ]},
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("new");
  const [activeCol, setActiveCol] = useState(initCollection);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [gridCols, setGridCols] = useState(isMobile ? 2 : 2);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => { setActiveCol(initCollection); }, [initCollection]);

  // Reset pagination whenever the tab / filters / sort change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCol, filters, sortBy]);

  // Build cross-collection ordered list:
  // When a specific collection is selected, continue into subsequent collections
  // so the "Виж още" button flows naturally across all collections.
  const displayList = useMemo(() => {
    if (!activeCol) {
      // All: respect collection order (cosmobella → demetrios → … → evening)
      const ordered = COLLECTIONS.flatMap(c => DRESSES.filter(d => d.collection === c.id));
      return applyFiltersAndSort(ordered, filters, sortBy);
    }
    // Start from the selected collection, then append subsequent ones
    const startIdx = COLLECTIONS.findIndex(c => c.id === activeCol);
    const ordered = [];
    for (let i = startIdx; i < COLLECTIONS.length; i++) {
      DRESSES.filter(d => d.collection === COLLECTIONS[i].id).forEach(d => ordered.push(d));
    }
    return applyFiltersAndSort(ordered, filters, sortBy);
  }, [activeCol, filters, sortBy]);

  // What's currently visible in the grid
  const visibleItems = displayList.slice(0, visibleCount);
  const remaining = displayList.length - visibleCount;
  const hasMore = remaining > 0;
  const allShown = displayList.length > 0 && !hasMore;
  // Is the active collection itself exhausted (but more from next ones)?
  const activeColCount = activeCol ? DRESSES.filter(d => d.collection === activeCol).length : 0;

  const activeCount = Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v != null).length;
  const activeColData = COLLECTIONS.find(c => c.id === activeCol);

  // Which collection is currently at the "edge" of what's visible
  const nextColLabel = useMemo(() => {
    if (!activeCol || !hasMore) return null;
    const lastVisible = visibleItems[visibleItems.length - 1];
    if (!lastVisible) return null;
    const lastColIdx = COLLECTIONS.findIndex(c => c.id === lastVisible.collection);
    const nextCol = COLLECTIONS[lastColIdx + 1];
    if (nextCol && lastVisible.collection !== activeCol) return null; // already into next
    return nextCol ? nextCol.label : null;
  }, [visibleItems, activeCol, hasMore]);

  const handleLoadMore = () => {
    setVisibleCount(v => Math.min(v + PAGE_SIZE, displayList.length + 1));
  };

  const handleRestart = () => {
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.collection.crumb}</div>
          <h1>
            {activeColData ? activeColData.label : <>{t.collection.title} <em>{t.collection.title_em}</em></>}
          </h1>
          {activeColData ? (
            <>
              <p style={{ fontFamily: 'var(--f-serif)', fontSize: 16, fontStyle: 'italic', opacity: 0.7, marginTop: 12, maxWidth: 480 }}>
                {lang === 'bg' ? activeColData.desc_bg : activeColData.desc_en}
              </p>
              <p className="collection-intro">
                {activeCol === "evening"
                  ? (isBg
                      ? `Официални, бални и абитуриентски рокли в София — елегантни вечерни рокли за абитуриентски бал, сватба, кръщене или коктейлно парти. Подбрани от Арети, булчински и сватбен салон в Лозенец. Записване за проба по предварителен час.`
                      : `Evening, prom and formal dresses in Sofia — elegant gowns for proms, weddings, christenings and cocktail events. Curated by Areti bridal salon in Lozenets. Fittings by appointment.`)
                  : (isBg
                      ? `Луксозни булчински и сватбени рокли от колекция ${activeColData.label} — част от каталога на Demetrios в булчински салон Арети, София. Всяка рокля пристига директно от Demetrios, с безплатни корекции до деня на сватбата. Записване за проба по предварителен час.`
                      : `Luxury ${activeColData.label} wedding dresses — part of the Demetrios catalogue at Areti bridal salon, Sofia. Every gown arrives directly from Demetrios, with free alterations until your wedding day. Fittings by appointment.`)}
              </p>
            </>
          ) : (
            <p className="collection-intro">
              {isBg
                ? "Над 100 луксозни булчински и сватбени рокли в София от четирите колекции на Demetrios — Cosmobella, Demetrios, Platinum и Destination Romance. Пет силуета: А-силует, русалка, принцеса, права линия и бохо. Арети е булчински салон и официален представител на Demetrios в България от 1992 г. Цените са от 1 000 до 4 000 €, с безплатни корекции и записване за проба по предварителен час."
                : "Over 100 luxury wedding dresses in Sofia from the four Demetrios collections — Cosmobella, Demetrios, Platinum and Destination Romance. Five silhouettes: A-line, mermaid, ball gown, column and boho. Areti is a bridal salon and the official Demetrios representative in Bulgaria since 1992. Prices from €1,000 to €4,000, with free alterations and fittings by appointment."}
            </p>
          )}
        </div>
        <div className="meta-stack">
          <div className="count">{visibleItems.length} / {displayList.length} {isBg ? 'модела' : 'styles'}</div>
        </div>
      </div>

      <div className="collection-tabs">
        <button className={`col-tab ${!activeCol ? 'active' : ''}`} onClick={() => setActiveCol(null)}>
          {isBg ? 'Всички' : 'All'}
        </button>
        {COLLECTIONS.map(c => (
          <button key={c.id} className={`col-tab ${activeCol === c.id ? 'active' : ''}`} onClick={() => setActiveCol(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="inner">
          <button className={`filter-chip ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}>
            {t.collection.filter} {activeCount > 0 && `(${activeCount})`} <span className="chev"></span>
          </button>
          {activeCount > 0 && (
            <button className="filter-chip" onClick={() => setFilters({})}>
              {t.collection.reset} ×
            </button>
          )}
          <span className="results">{t.collection.results(displayList.length)}</span>
          <span className="sort">
            {t.collection.sort}: {t.collection.sort_new}
          </span>
        </div>
      </div>
      {filtersOpen && <FilterPanel t={t} lang={lang} filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />}

      <div className="mobile-grid-bar">
        <span className="mobile-grid-count">{visibleItems.length} {isBg ? "модела" : "styles"}</span>
        <div className="grid-toggle">
          <button className={gridCols === 1 ? "active" : ""} onClick={() => setGridCols(1)} aria-label="1 column">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <rect x="2" y="2" width="16" height="7" rx="1"/><rect x="2" y="11" width="16" height="7" rx="1"/>
            </svg>
          </button>
          <button className={gridCols === 2 ? "active" : ""} onClick={() => setGridCols(2)} aria-label="2 columns">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/>
              <rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Grid — render visible items with collection dividers */}
      <CollectionGrid
        items={visibleItems}
        lang={lang}
        gridCols={gridCols}
        goProduct={goProduct}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        activeCol={activeCol}
      />

      {/* Load more / End state */}
      <div style={{ padding: "48px var(--gutter) 80px", textAlign: "center" }}>
        {hasMore && (
          <div>
            {/* Progress indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 28 }}>
              <div style={{ flex: 1, maxWidth: 200, height: 1, background: "var(--rule)" }} />
              <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mute)" }}>
                {visibleItems.length} {isBg ? "от" : "of"} {displayList.length}
              </span>
              <div style={{ flex: 1, maxWidth: 200, height: 1, background: "var(--rule)" }} />
            </div>
            {/* Progress bar */}
            <div style={{ maxWidth: 320, margin: "0 auto 32px", height: 2, background: "var(--champagne)", borderRadius: 1 }}>
              <div style={{ height: "100%", background: "var(--champagne-deep)", borderRadius: 1, width: `${(visibleItems.length / displayList.length) * 100}%`, transition: "width .4s ease" }} />
            </div>
            <button className="btn btn-solid" onClick={handleLoadMore} style={{ minWidth: 220 }}>
              {isBg
                ? `Виж още ${Math.min(PAGE_SIZE, remaining)} ${remaining === 1 ? "рокля" : "рокли"}`
                : `Load ${Math.min(PAGE_SIZE, remaining)} more`}
            </button>
            {nextColLabel && (
              <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-mute)", marginTop: 12 }}>
                {isBg ? `Следва: ${nextColLabel}` : `Next up: ${nextColLabel}`}
              </p>
            )}
          </div>
        )}

        {allShown && displayList.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 28 }}>
              <div style={{ flex: 1, maxWidth: 200, height: 1, background: "var(--rule)" }} />
              <span style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 18, color: "var(--ink-soft)" }}>
                {isBg ? "Разгледахте всичко" : "You've seen it all"}
              </span>
              <div style={{ flex: 1, maxWidth: 200, height: 1, background: "var(--rule)" }} />
            </div>
            <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink-mute)", marginBottom: 28 }}>
              {isBg
                ? "Искате ли да започнете от начало?"
                : "Would you like to start over?"}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-solid" onClick={handleRestart}>
                {isBg ? "Към началото ↑" : "Back to top ↑"}
              </button>
              <button className="btn" onClick={() => { setActiveCol(null); handleRestart(); }}>
                {isBg ? "Всички колекции" : "All collections"}
              </button>
              <button className="btn" onClick={() => setRoute("booking")}>
                {isBg ? "Запази проба →" : "Book a fitting →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {!initCollection && <CollectionSeoContent lang={lang} setRoute={setRoute} />}
      {initCollection && <SubCollectionSeo lang={lang} setRoute={setRoute} colId={initCollection} />}

      {/* Mobile filter FAB + bottom sheet via portal (avoids page-enter transform) */}
      {createPortal(
        <>
        <button className="mobile-filter-fab" onClick={() => setMobileSheetOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          <span>{isBg ? "Филтри" : "Filters"}</span>
          {activeCount > 0 && <span className="mfab-badge">{activeCount}</span>}
        </button>
        {mobileSheetOpen && (
        <div className="msheet-overlay" onClick={() => setMobileSheetOpen(false)}>
          <div className="msheet" onClick={e => e.stopPropagation()}>
            <div className="msheet-handle" />
            <div className="msheet-head">
              <span>{isBg ? "Филтри и сортиране" : "Filter & Sort"}</span>
              <button className="msheet-close" onClick={() => setMobileSheetOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="msheet-body">
              <div className="msheet-section">
                <div className="msheet-label">{isBg ? "Колекция" : "Collection"}</div>
                <div className="msheet-pills">
                  <span className={`filter-pill ${!activeCol ? "on" : ""}`} onClick={() => setActiveCol(null)}>
                    {isBg ? "Всички" : "All"}
                  </span>
                  {COLLECTIONS.map(c => (
                    <span key={c.id} className={`filter-pill ${activeCol === c.id ? "on" : ""}`} onClick={() => setActiveCol(c.id)}>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="msheet-section">
                <div className="msheet-label">{isBg ? "Силует" : "Silhouette"}</div>
                <div className="msheet-pills">
                  {t.collection.silhouettes.map(s => (
                    <span key={s} className={`filter-pill ${(filters.silhouette || []).includes(s) ? "on" : ""}`}
                      onClick={() => { const cur = filters.silhouette || []; setFilters({ ...filters, silhouette: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] }); }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="msheet-section">
                <div className="msheet-label">{isBg ? "Подреди" : "Sort by"}</div>
                <div className="msheet-pills">
                  {[["new", isBg ? "Най-нови" : "Newest"]].map(([val, label]) => (
                    <span key={val} className={`filter-pill ${sortBy === val ? "on" : ""}`} onClick={() => setSortBy(val)}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="msheet-foot">
              {activeCount > 0 && (
                <button className="msheet-reset" onClick={() => { setFilters({}); setActiveCol(null); }}>
                  {isBg ? "Изчисти всички" : "Clear all"}
                </button>
              )}
              <button className="btn btn-solid msheet-apply" onClick={() => setMobileSheetOpen(false)}>
                {isBg ? `Виж ${displayList.length} модела` : `Show ${displayList.length} styles`}
              </button>
            </div>
          </div>
        </div>
        )}
        </>,
        document.body
      )}
    </div>
  );
}

// Renders grid with collection-change dividers
function CollectionGrid({ items, lang, gridCols, goProduct, favorites, toggleFavorite, activeCol }) {
  const isBg = lang === "bg";
  const rows = [];
  let lastCol = null;

  items.forEach((d, i) => {
    // Insert a divider when the collection changes (only when browsing cross-collection)
    if (d.collection !== lastCol && lastCol !== null) {
      const colData = COLLECTIONS.find(c => c.id === d.collection);
      rows.push(
        <div key={`divider-${d.collection}`} className="col-divider">
          <div className="col-divider-inner">
            <div style={{ height: 1, background: "var(--rule)", flex: 1 }} />
            <span style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(14px, 1.5vw, 18px)", color: "var(--ink-soft)", whiteSpace: "nowrap", padding: "0 20px" }}>
              {colData ? colData.label : d.collection}
            </span>
            <div style={{ height: 1, background: "var(--rule)", flex: 1 }} />
          </div>
        </div>
      );
    }
    lastCol = d.collection;
    rows.push(
      <DressCard key={d.ref} d={d} lang={lang} onClick={() => goProduct(d.ref)} favorites={favorites} toggleFavorite={toggleFavorite} />
    );
  });

  // We need to wrap non-divider items into the grid. Use a fragment approach:
  // Group consecutive same-collection items and render them in a grid div.
  const segments = [];
  let currentSegment = [];
  let currentIsDivider = false;

  rows.forEach((row, i) => {
    const isDivider = row.key && row.key.startsWith("divider-");
    if (isDivider) {
      if (currentSegment.length) segments.push({ isDivider: false, items: currentSegment });
      segments.push({ isDivider: true, el: row });
      currentSegment = [];
    } else {
      currentSegment.push(row);
    }
  });
  if (currentSegment.length) segments.push({ isDivider: false, items: currentSegment });

  return (
    <>
      {segments.map((seg, i) =>
        seg.isDivider ? (
          <div key={i}>{seg.el}</div>
        ) : (
          <div key={i} className={`collection-grid cols-${gridCols}`}>
            {seg.items}
          </div>
        )
      )}
    </>
  );
}

function ProductPage({ lang, setRoute, productRef, favorites = [], toggleFavorite, goBooking, goProduct }) {
  const t = i18n[lang];
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const dress = DRESSES.find(d => d.ref === productRef) || DRESSES[0];
  const isFav = favorites.includes(dress.ref);
  const isBg = lang === "bg";
  const heading = getProductHeading(dress, lang);
  const cardName = `Style ${dress.ref}`;
  const productDescription = buildProductDescription(dress, lang) || (isBg ? (dress.description_bg || t.product.desc) : (dress.description_en || t.product.desc));
  const productSpecs = buildProductSpecs(dress, lang);
  const colData = COLLECTIONS.find(c => c.id === dress.collection);

  // Unique, trimmed meta description derived from the generated copy
  // (the stored seo_description_* fields are near-duplicate across products).
  const metaDesc = (() => {
    const full = productDescription || "";
    if (full.length <= 160) return full;
    const cut = full.slice(0, 160);
    return cut.slice(0, cut.lastIndexOf(" ")) + "…";
  })();

  useSeo({
    title: isBg ? (dress.seo_title_bg || `${heading}`) : (dress.seo_title_en || `${heading}`),
    description: metaDesc || (isBg ? dress.seo_description_bg : dress.seo_description_en),
    image: dress.imgs?.[0] || dress.img,
    url: `/product/${dress.ref}`,
    type: "product",
    lang,
    keywords: `булчинска рокля ${dress.ref}, ${dress.silhouette}, ${colData?.label || ''}, Demetrios, Арети София`,
    jsonLd: {
      "@graph": [
        enhancedProductSchema(dress, lang),
        breadcrumbSchema([
          { name: "Арети",                         url: "/" },
          { name: isBg ? "Колекция" : "Collection", url: "/collection" },
          ...(colData ? [{ name: colData.label, url: `/collection/${colData.id}` }] : []),
          { name: heading,                         url: `/product/${dress.ref}` },
        ]),
      ],
    },
    jsonLdId: `product-${dress.ref}`,
  });

  const galleryImgs = dress.imgs && dress.imgs.length > 0 ? dress.imgs : [dress.img, IMG.detail1, IMG.detail2, IMG.detail2];

  return (
    <div className="page-enter">
      <div className="product">
        <div className="product-crumb">
          <a onClick={() => setRoute("home")} style={{ cursor: "pointer" }}>Areti</a>
          <a onClick={() => setRoute("collection")} style={{ cursor: "pointer" }}>{t.product.crumb_back}</a>
          <span style={{ color: "var(--ink)" }}>{cardName}</span>
        </div>
        <div className="product-main">
          <div className="product-gallery">
            <Img src={galleryImgs[0]} alt={getProductAlt(dress, lang, 0)} className="main-img" style={{ cursor: "zoom-in" }} priority width={1200} height={1600} />
            {galleryImgs.slice(1, 4).map((imgSrc, i) => (
              <Img key={i} src={imgSrc} alt={getProductAlt(dress, lang, i + 1)} className="thumb" style={{ cursor: "zoom-in" }} width={600} height={800} />
            ))}
            {galleryImgs.length > 4 && (
              <div className="thumb" style={{ background: "var(--bg-deep)", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => setLightboxIdx(0)}>
                <span style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ink-soft)" }}>+ {galleryImgs.length - 4} снимки</span>
              </div>
            )}
          </div>
          <aside className="product-info">
            <div className="designer">{t.product.designer}</div>
            <h1>{heading}</h1>
            <div className="ref">{t.product.ref}: {dress.ref}</div>
            <p className="desc">{productDescription}</p>
            <dl>
              {productSpecs.map((s) => (
                <div className="spec-row" key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>
              ))}
            </dl>
            <div className="cta-stack" style={{ marginTop: 32 }}>
              <button className="btn btn-solid" onClick={() => (goBooking ? goBooking(dress) : setRoute("booking"))}>{t.product.cta_book}</button>
              <a className="btn" href="tel:+359878521660">{t.product.cta_inquire}</a>
              <button
                className={`fav-btn-product ${isFav ? "on" : ""}`}
                onClick={() => toggleFavorite && toggleFavorite(dress.ref)}
              >
                <svg viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {isFav ? (lang === "bg" ? "В любими ✓" : "Saved ✓") : (lang === "bg" ? "Добави в любими" : "Add to wishlist")}
              </button>
            </div>
          </aside>
        </div>
        <section style={{ padding: "var(--s-9) var(--gutter)", borderTop: "1px solid var(--rule)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 48 }}>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1 }}>{t.product.similar}</h2>
            <span className="t-meta">— Demetrios 2026</span>
          </div>
          <div className="dress-grid dress-grid--4">
            {DRESSES.filter(d => d.ref !== dress.ref).slice(0, 4).map((d) => (
              <DressCard key={d.ref} d={d} lang={lang} onClick={() => { goProduct && goProduct(d.ref); window.scrollTo(0, 0); }} favorites={favorites} toggleFavorite={toggleFavorite} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="btn" onClick={() => setRoute("collection")}>
              {lang === "bg" ? "Виж цялата колекция" : "View full collection"} <span style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>→</span>
            </button>
          </div>
        </section>

        {(() => {
          const refLower = dress.ref.toLowerCase();
          const related = BLOG_POSTS.filter(p => p.relatedRefs && p.relatedRefs.some(r => r.toLowerCase() === refLower));
          if (!related.length) return null;
          return (
            <section style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 0" }}>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 24, fontWeight: 400, marginBottom: 20 }}>
                {isBg ? "Свързани статии" : "Related articles"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {related.slice(0, 3).map(post => (
                  <a key={post.id} href={blogPostPath(post)} onClick={e => { e.preventDefault(); setRoute(`blog/${post.slug || post.id}`); window.scrollTo(0, 0); }}
                    style={{ display: "block", padding: "16px 20px", background: "var(--surface)", borderRadius: 8, textDecoration: "none", color: "var(--ink)", transition: "box-shadow 0.2s" }}>
                    <div style={{ fontFamily: "var(--f-display)", fontSize: 15, fontWeight: 400, marginBottom: 6 }}>{post.title}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>{post.excerpt?.slice(0, 100)}…</div>
                  </a>
                ))}
              </div>
            </section>
          );
        })()}
      </div>
      {lightboxIdx !== null && (
        <Lightbox imgs={galleryImgs} idx={lightboxIdx} setIdx={setLightboxIdx} label={heading} dress={dress} lang={lang} />
      )}
    </div>
  );
}

function Lightbox({ imgs, idx, setIdx, label, dress, lang }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIdx(null);
      if (e.key === "ArrowRight") setIdx((idx + 1) % imgs.length);
      if (e.key === "ArrowLeft") setIdx((idx - 1 + imgs.length) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="lightbox" onClick={() => setIdx(null)}>
      <button className="lightbox-close" onClick={() => setIdx(null)}>Close ×</button>
      <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + imgs.length) % imgs.length); }}>‹</button>
      <Img src={imgs[idx]} alt={dress ? getProductAlt(dress, lang || 'bg', idx) : label} style={{ aspectRatio: "3/4", height: "85vh", width: "auto" }} />
      <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }}>›</button>
      <div className="lightbox-counter">{(idx + 1).toString().padStart(2, "0")} / {imgs.length.toString().padStart(2, "0")}</div>
    </div>
  );
}

function AccessoriesPage({ lang, setRoute }) {
  useSeo({
    title: lang === "bg" ? "Аксесоари за булки — воали, диадеми, бижута" : "Bridal Accessories — Veils, Tiaras, Jewellery",
    description: lang === "bg"
      ? "Луксозни булчински аксесоари в Арети — воали, диадеми, обици, обувки и бижута. Внимателно подбрана селекция за финалния щрих на сватбената визия."
      : "Luxury bridal accessories at Areti — veils, tiaras, earrings, shoes and jewellery. A curated selection for the final touch of your bridal look.",
    url: "/accessories",
    lang,
    keywords: "булчински аксесоари, воали, диадеми, бижута за булки, обувки за сватба, Арети София",
    jsonLd: breadcrumbSchema([
      { name: lang === "bg" ? "Начало" : "Home", url: "/" },
      { name: lang === "bg" ? "Аксесоари" : "Accessories", url: "/accessories" },
    ]),
  });
  const t = i18n[lang];
  const [cat, setCat] = useState(t.accessories.categories[0]);

  const items = useMemo(() => {
    if (cat === t.accessories.categories[0]) return ACCESSORIES;
    return ACCESSORIES.filter(a => (lang === "bg" ? a.cat : a.cat_en) === cat);
  }, [cat, lang]);

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.accessories.crumb}</div>
          <h1>{t.accessories.title}</h1>
          <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 19, color: "var(--ink-soft)", marginTop: 24, maxWidth: 480 }}>{t.accessories.lede}</p>
        </div>
        <div className="meta-stack">
          <div className="count">{items.length} продукта</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "32px var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto", flexWrap: "wrap" }}>
        {t.accessories.categories.map(c => (
          <button
            key={c}
            className={`filter-chip ${cat === c ? "active" : ""}`}
            onClick={() => setCat(c)}
          >{c}</button>
        ))}
      </div>
      <div className="acc-grid">
        {items.map((a, i) => (
          <article key={i} className="acc-card">
            <Img src={a.img} alt={getAccessoryAlt(a, lang)} className="img" width={600} height={800} />
            <div className="info">
              <div>
                <h3>{lang === "bg" ? a.name_bg : a.name_en}</h3>
                <div className="meta" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: 4 }}>{lang === "bg" ? a.cat : a.cat_en}</div>
              </div>
              {a.price > 0 && <span className="price">{a.price.toLocaleString(lang === "bg" ? "bg-BG" : "en-US")} {t.common.bgn}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WishlistPage({ lang, setRoute, favorites = [], toggleFavorite, goBooking }) {
  const t = i18n[lang];
  useSeo({
    title: lang === "bg" ? "Любими — моят списък булчински рокли" : "Wishlist — My Saved Wedding Dresses",
    description: lang === "bg" ? "Вашите запазени модели булчински рокли в Арети." : "Your saved wedding dress styles at Areti.",
    url: "/wishlist", lang, noindex: true,
  });
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const favDresses = DRESSES.filter(d => favorites.includes(d.ref));

  const canSend = form.name && form.email && form.phone;

  if (sent) {
    return (
      <div className="page-enter">
        <div className="confirmation" style={{ padding: "120px var(--gutter)", textAlign: "center" }}>
          <div className="check">✓</div>
          <h2>{lang === "bg" ? "Запитването е изпратено" : "Inquiry sent"} <em>·</em></h2>
          <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, fontStyle: "italic", color: "var(--ink-soft)", marginTop: 16 }}>
            {lang === "bg" ? "Ще се свържем с вас до 24 часа." : "We'll get back to you within 24 hours."}
          </p>
          <button className="btn" style={{ marginTop: 36 }} onClick={() => setRoute("home")}>{lang === "bg" ? "Към началото →" : "Go home →"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>— {lang === "bg" ? "Любими" : "Wishlist"}</div>
          <h1>{lang === "bg" ? <>Избрани <em>рокли</em></> : <>My <em>wishlist</em></>}</h1>
        </div>
        <div className="meta-stack">
          <div className="crumb">{favDresses.length}</div>
          <div className="count">{lang === "bg" ? "рокли" : "styles"}</div>
        </div>
      </div>
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "24px var(--gutter) 0" }}>
        <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)", maxWidth: 480 }}>
          {lang === "bg"
            ? "Запазените от вас рокли. Можете да запитате за всички наведнъж."
            : "Your saved styles. You can inquire about all of them at once."}
        </p>
      </div>

      {favDresses.length === 0 ? (
        <div style={{ padding: "80px var(--gutter)", textAlign: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.2" width="48" height="48" style={{ marginBottom: 24 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 18, color: "var(--ink-mute)" }}>
            {lang === "bg" ? "Все още нямате запазени рокли." : "No saved styles yet."}
          </p>
          <button className="btn" style={{ marginTop: 24 }} onClick={() => setRoute("collection")}>
            {lang === "bg" ? "Разгледай колекцията →" : "Browse collection →"}
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter) var(--s-10)" }}>
          <div className="wishlist-grid">
            {favDresses.map(d => {
              const name = `Style ${d.ref}`;
              const sil = lang === "bg" ? d.silhouette : d.silhouette_en;
              return (
                <div key={d.ref} className="wishlist-card">
                  <Img src={d.img} alt={getProductAlt(d, lang, 0)} className="wishlist-img" width={500} height={650} />
                  <div className="wishlist-card-info">
                    <div>
                      <div className="wishlist-card-name">{name}</div>
                      <div className="wishlist-card-meta">{sil}{d.fabric ? ` · ${localizeFabric(d.fabric, lang)}` : ""}</div>
                      {d.price > 0 && <div className="wishlist-card-price">{t.common.from} {d.price.toLocaleString(lang === "bg" ? "bg-BG" : "en-US")} {t.common.bgn}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-solid" style={{ flex: 1, padding: "10px 0", fontSize: 10 }} onClick={() => goBooking ? goBooking(d) : setRoute("booking")}>
                        {lang === "bg" ? "Запази проба" : "Book fitting"}
                      </button>
                      <button
                        className="wishlist-remove"
                        onClick={() => toggleFavorite && toggleFavorite(d.ref)}
                        aria-label={t.common.remove}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wishlist-inquiry">
            <div className="t-eyebrow" style={{ marginBottom: 20 }}>— {lang === "bg" ? "Групово запитване" : "Group inquiry"}</div>
            <h3>{lang === "bg" ? <>Попитайте за <em>всички наведнъж</em></> : <>Inquire about <em>all at once</em></>}</h3>
            <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", marginTop: 8, marginBottom: 32 }}>
              {lang === "bg"
                ? `Изпращате запитване за ${favDresses.length} рокл${favDresses.length === 1 ? "я" : "и"}. Ще се свържем и ще насрочим проба.`
                : `You're inquiring about ${favDresses.length} style${favDresses.length !== 1 ? "s" : ""}. We'll contact you to schedule fittings.`}
            </p>

            <div className="wishlist-selected-refs">
              {favDresses.map(d => (
                <span key={d.ref} className="wishlist-ref-pill">{t.common.ref_short} {d.ref}</span>
              ))}
            </div>

            <div className="fields-row" style={{ marginTop: 28 }}>
              <div className="field">
                <label>{lang === "bg" ? "Име" : "Name"}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.common.placeholder_name} />
              </div>
              <div className="field">
                <label>{lang === "bg" ? "Телефон" : "Phone"}</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+359 ..." />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="maria@example.com" />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label>{lang === "bg" ? "Допълнително" : "Notes"}</label>
              <textarea rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={lang === "bg" ? "Дата на сватбата, бюджет, въпроси..." : "Wedding date, budget, questions..."} />
            </div>
            <button
              className="btn btn-solid"
              style={{ marginTop: 24, opacity: canSend ? 1 : 0.4 }}
              disabled={!canSend}
              onClick={() => {
                if (!canSend) return;
                const inquiry = {
                  id: Math.random().toString(36).slice(2,10) + Date.now().toString(36),
                  createdAt: new Date().toISOString(),
                  name: form.name,
                  email: form.email,
                  phone: form.phone,
                  notes: form.notes,
                  dressRefs: favDresses.map(d => d.ref),
                  status: "new",
                };
                try {
                  const existing = JSON.parse(localStorage.getItem("areti_inquiries") || "[]");
                  localStorage.setItem("areti_inquiries", JSON.stringify([...existing, inquiry]));
                } catch {}
                setSent(true);
              }}
            >
              {lang === "bg" ? "Изпрати запитването →" : "Send inquiry →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { CollectionPage, ProductPage, AccessoriesPage, WishlistPage };
