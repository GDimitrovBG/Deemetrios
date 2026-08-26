import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import i18n from './i18n';
import { IMG, DRESSES, COLLECTIONS } from './data';
import { Img } from './components';
import { DressCard } from './home';
import { useSeo, breadcrumbSchema, faqSchema, blogPostPath } from './seo';
import { BLOG_POSTS } from './blog_data';
import { getProductHeading, getProductAlt, enhancedProductSchema, collectionItemListSchema, localizeFabric, buildProductDescription, buildProductSpecs, buildProductTitle, collectionLabel } from './seo-helpers';
import { withLang, blogHref } from './router';

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
// During build-time prerender, render the full grid so every product gets a
// crawlable <a href> link from its collection page (fixes orphan products).
const INITIAL_PAGE_SIZE = (typeof window !== 'undefined' && window.__PRERENDER__) ? 10_000 : PAGE_SIZE;

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
    { q: "Къде да намеря сватбени рокли в София?", a: "Салонът на Арети се намира в кв. Лозенец, София (ул. Крум Попов 63) и предлага над 100 сватбени и булчински рокли на място — оригинални модели Demetrios в 5 силуета и 4 колекции. Можете да пробвате неограничен брой рокли по предварителен час, а всички корекции се извършват в ателието на място." },
    { q: "Колко струват булчинските рокли в Арети?", a: "Цените на булчинските рокли в Арети варират в зависимост от колекцията: Cosmobella от 1 000 до 1 800 €, Demetrios от 1 500 до 2 800 €, Destination Romance от 1 200 до 2 000 €, а Demetrios Platinum — от 2 500 до 4 000 €. В цената са включени консултация с личен стилист и една безплатна корекция." },
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
    { q: "Where can I find wedding dresses in Sofia?", a: "Areti's salon is in Lozenets, Sofia (63 Krum Popov St) and carries over 100 wedding and bridal dresses on site — original Demetrios styles across 5 silhouettes and 4 collections. You can try on an unlimited number of gowns by appointment, and all alterations are done in our in-house atelier." },
    { q: "How much do wedding dresses cost at Areti?", a: "Prices vary by collection: Cosmobella from €1,000 to €1,800, Demetrios from €1,500 to €2,800, Destination Romance from €1,200 to €2,000, and Demetrios Platinum from €2,500 to €4,000. A consultation and one free alteration are included." },
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

// Guide silhouette keys → landing-page slugs (only the 3 with real stock).
const GUIDE_KEY_TO_SLUG = { aline: "a-siluet", mermaid: "rusalka", ballgown: "printsesa" };

function CollectionSeoContent({ lang, setRoute, goSilhouette }) {
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
        {isBg ? "Булчински и сватбени рокли — наръчник по силуети" : "Wedding dresses — silhouette guide"}
      </h2>
      <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", marginBottom: 32 }}>
        {isBg
          ? "Изборът на силует е първата и най-важна стъпка. Ето кратък наръчник за петте основни типа сватбени рокли, които ще намерите в нашия салон."
          : "Choosing the right silhouette is the first and most important step. Here's a quick guide to the five main types of wedding dresses in our salon."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 48 }}>
        {Object.entries(sil).map(([key, { name, desc }]) => {
          const slug = GUIDE_KEY_TO_SLUG[key];
          const hasPage = slug && (silCounts[key] || 0) > 0;
          return (
          <div key={key} style={{ borderTop: "2px solid var(--champagne-deep)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <h3 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 400 }}>
                {hasPage
                  ? <a href={withLang(`/collection/silueti/${slug}`, lang)} onClick={(e) => { e.preventDefault(); goSilhouette && goSilhouette(slug); }} style={{ color: "inherit" }}>{name}</a>
                  : name}
              </h3>
              <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>{silCounts[key] || 0} {isBg ? "модела" : "styles"}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{desc}</p>
            {hasPage && (
              <a href={withLang(`/collection/silueti/${slug}`, lang)} onClick={(e) => { e.preventDefault(); goSilhouette && goSilhouette(slug); }} style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "underline" }}>
                {isBg ? `Вижте роклите ${name.toLowerCase()} →` : `See ${name.toLowerCase()} dresses →`}
              </a>
            )}
          </div>
        );})}
      </div>

      {/* Free-tool cross-link: the quiz is a strong next step for a visitor
          still deciding, and a useful internal link into the product pages. */}
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 40 }}>
        {isBg ? "Не сте сигурна кой силует ви отива? " : "Not sure which silhouette suits you? "}
        <a href={withLang("/kviz", lang)} onClick={(e) => { e.preventDefault(); setRoute("quiz"); }} style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 4 }}>
          {isBg ? "Направете безплатния тест за булчинска рокля →" : "Take the free wedding dress quiz →"}
        </a>
      </p>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? "Цени на булчинските рокли" : "Wedding dress prices"}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 24 }}>
        {isBg
          ? "Цените в Арети зависят от колекцията и сложността на изработката. Всички рокли са оригинални Demetrios — с международна гаранция за качество. В цената е включена консултация и една безплатна корекция."
          : "Prices at Areti depend on the collection and craftsmanship. All dresses are original Demetrios with an international quality guarantee. A consultation and one free alteration are included."}
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
        {isBg ? "Как да изберете сватбена рокля" : "How to choose a wedding dress"}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 12 }}>
        {isBg
          ? "Изборът на сватбена рокля е едно от най-вълнуващите решения преди сватбата. Препоръчваме да започнете 8–12 месеца предварително — така имате достатъчно време за поръчка по ваш размер и корекции. Запишете се за проба и нашият стилист ще подбере модели, подходящи за вашата фигура, стил и бюджет."
          : "Choosing a wedding dress is one of the most exciting decisions before the wedding. We recommend starting 8–12 months ahead — this gives enough time for custom orders and alterations. Book a fitting and our stylist will select dresses suited to your figure, style and budget."}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 12 }}>
        {isBg
          ? "В Арети разполагаме с над 100 булчински и сватбени рокли на място в 5 силуета и от 4 колекции на Demetrios. Можете да пробвате неограничен брой модели. Нашата шивачка Кети извършва всички корекции на място — от промяна на дължината до пълна промяна на деколтето."
          : "At Areti we have over 100 wedding dresses on-site in 5 silhouettes from 4 Demetrios collections. You can try an unlimited number of styles. Our seamstress Keti handles all alterations in-house — from hemming to full neckline modifications."}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button className="btn btn-solid" onClick={() => setRoute("booking")}>
          {isBg ? "Запази час за проба →" : "Book a fitting →"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48, fontSize: 14 }}>
        <a href={blogHref("svatbeni-rokli-kak-da-namerite-perfektnata", lang)} onClick={e => { e.preventDefault(); setRoute("blog/svatbeni-rokli-kak-da-namerite-perfektnata"); }} style={{ color: "var(--ink-soft)" }}>
          {isBg ? "Пълен наръчник за избор →" : "Full buying guide →"}
        </a>
        <a href={blogHref("bulchinski-rokli-tseni-2026", lang)} onClick={e => { e.preventDefault(); setRoute("blog/bulchinski-rokli-tseni-2026"); }} style={{ color: "var(--ink-soft)" }}>
          {isBg ? "Цени 2026 →" : "Prices 2026 →"}
        </a>
        <a href={blogHref("bulchinska-roklia-silueti-narachnik", lang)} onClick={e => { e.preventDefault(); setRoute("blog/bulchinska-roklia-silueti-narachnik"); }} style={{ color: "var(--ink-soft)" }}>
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
    cosmobella: { heading: "Булчински рокли Cosmobella", price: "1 000 – 1 800 €", text: "Cosmobella е достъпната линия на Demetrios — романтични силуети с флорални апликации, илюзорни деколтета и деликатни презрамки. Идеална за булки, които търсят качество и елегантност на разумна цена. Всички сватбени рокли са оригинални, с международна гаранция.", blogSlug: "bulchinski-rokli-tseni-2026", blogLabel: "Цени на булчинските рокли 2026 →" },
    demetrios: { heading: "Булчински рокли Demetrios", price: "1 500 – 2 800 €", text: "Основната колекция Demetrios предлага пълния спектър от силуети — А-силует, русалка и принцеса. Съвременни сватбени рокли с дантела, бродерия и тюл с мъниста. Водещата линия на бранда с над 40 години традиция в булчинската мода.", blogSlug: "bulchinska-roklia-silueti-narachnik", blogLabel: "Наръчник по силуети →" },
    platinum: { heading: "Луксозни булчински рокли Demetrios Platinum", price: "2 500 – 4 000 €", text: "Demetrios Platinum е ексклузивната линия за булки, които не правят компромиси. Ръчно апликирани кристали Swarovski, перли и луксозни европейски дантели. Всеки модел изисква над 200 часа ръчна работа — истинско произведение на изкуството.", blogSlug: "luksozni-bulchinski-rokli", blogLabel: "Луксозни булчински рокли — детайлите →" },
    destination: { heading: "Сватбени рокли Destination Romance", price: "1 200 – 2 000 €", text: "Destination Romance е създадена за дестинационни сватби — на плаж, в градина или на открито. Леки сватбени рокли с къси шлейфове и бохо естетика. Удобни и красиви модели, които се пътуват лесно и изглеждат зашеметяващо под слънцето.", blogSlug: "svatbeni-rokli-kak-da-namerite-perfektnata", blogLabel: "Как да намерите перфектната сватбена рокля →" },
    evening: { heading: "Официални, бални и абитуриентски рокли в София", price: "по запитване", text: "Освен булчински рокли, Арети предлага и официални вечерни рокли за специални поводи — абитуриентски бал, сватба като гостенка, кръщене или коктейлно парти. Елегантни абитуриентски рокли и бални рокли в София с богат избор от силуети, цветове и тъкани. Запазете час за проба и нашият стилист ще ви помогне да изберете перфектната рокля за вашето събитие.", blogSlug: "abiturientski-balni-rokli-sofia", blogLabel: "Как да изберете абитуриентска рокля →" },
  },
  en: {
    cosmobella: { heading: "Cosmobella Wedding Dresses", price: "€1,000 – €1,800", text: "Cosmobella is the accessible Demetrios line — romantic silhouettes with floral appliqués, illusion necklines and delicate straps. Perfect for brides seeking quality and elegance at a reasonable price. All dresses are original with an international guarantee.", blogSlug: "bulchinski-rokli-tseni-2026", blogLabel: "Wedding dress prices 2026 →" },
    demetrios: { heading: "Demetrios Wedding Dresses", price: "€1,500 – €2,800", text: "The core Demetrios collection offers the full range of silhouettes — A-line, mermaid and ball gown. Contemporary designs in lace, embroidery and beaded tulle. The brand's flagship line with over 40 years of bridal tradition.", blogSlug: "bulchinska-roklia-silueti-narachnik", blogLabel: "Silhouette guide →" },
    platinum: { heading: "Luxury Demetrios Platinum Wedding Dresses", price: "€2,500 – €4,000", text: "Demetrios Platinum is the exclusive line for brides who don't compromise. Hand-applied Swarovski crystals, pearls and luxurious European lace. Each gown requires over 200 hours of handwork — a true work of art.", blogSlug: "luksozni-bulchinski-rokli", blogLabel: "Luxury wedding dresses — the details →" },
    destination: { heading: "Destination Romance Wedding Dresses", price: "€1,200 – €2,000", text: "Destination Romance is designed for destination weddings — beach, garden or outdoor. Lightweight fabrics, short trains and boho aesthetics. Comfortable and beautiful gowns that travel easily.", blogSlug: "svatbeni-rokli-kak-da-namerite-perfektnata", blogLabel: "How to find the perfect wedding dress →" },
    evening: { heading: "Evening, Prom & Formal Dresses in Sofia", price: "on request", text: "Beyond wedding gowns, Areti offers formal evening dresses for special occasions — proms, wedding guests, christenings and cocktail parties. Elegant prom and ball dresses in Sofia with a wide selection of silhouettes, colours and fabrics. Book a fitting and our stylist will help you find the perfect dress for your event.", blogSlug: "abiturientski-balni-rokli-sofia", blogLabel: "How to choose a prom dress →" },
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
        <span>{isBg ? "Проба и безплатна корекция" : "Fitting & free alteration"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-solid" onClick={() => setRoute("booking")}>
          {isBg ? "Запази проба →" : "Book a fitting →"}
        </button>
        <button className="btn" onClick={() => setRoute("collection")}>
          {isBg ? "Всички колекции" : "All collections"}
        </button>
      </div>
      {info.blogSlug && (
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <a href={blogHref(info.blogSlug, lang)} onClick={e => { e.preventDefault(); setRoute(`blog/${info.blogSlug}`); }} style={{ color: "var(--ink-soft)" }}>
            {info.blogLabel}
          </a>
        </div>
      )}
    </section>
  );
}

// Silhouette landing pages — /collection/silueti/<slug>. Target long-tail
// queries ("булчинска рокля русалка/принцеса/А-силует") with existing stock.
// Slugs kept in sync with SILHOUETTE_IDS in router.js.
const SILHOUETTE_PAGES = {
  rusalka: {
    bg: "Русалка", en: "Mermaid",
    h1_bg: "Булчински рокли русалка", h1_en: "Mermaid Wedding Dresses",
    intro_bg: "Булчинската рокля тип русалка приляга плътно по тялото от бюста до коляното, след което се разширява във фина пола. Силуетът подчертава извивките и е идеален за булки, които искат чувствена, драматична визия. В Арети предлагаме оригинални модели Demetrios с този силует.",
    intro_en: "A mermaid wedding dress fits closely from the bust to the knee, then flares into a dramatic skirt. The silhouette accentuates the curves and suits brides who want a sensual, striking look. Areti offers original Demetrios mermaid gowns in Sofia.",
    meta_bg: "Булчински рокли русалка в София — прилепнал силует, който подчертава извивките. Оригинални модели Demetrios, цени от 1 000 €.",
    meta_en: "Mermaid wedding dresses in Sofia — a fitted silhouette that accentuates the curves. Original Demetrios styles from €1,000.",
  },
  printsesa: {
    bg: "Принцеса", en: "Ball gown",
    h1_bg: "Булчински рокли принцеса", h1_en: "Princess Ball Gown Wedding Dresses",
    intro_bg: "Булчинската рокля тип принцеса има прилепнал корсет и обемна пола, която създава класическа, приказна визия. Този силует е сред най-желаните за традиционни сватби и подхожда на почти всяка фигура. Разгледайте оригиналните модели принцеса на Demetrios в салон Арети, София.",
    intro_en: "A princess (ball gown) wedding dress pairs a fitted bodice with a full skirt for a classic, fairy-tale look. It is one of the most requested silhouettes for traditional weddings and flatters almost every body type. Explore original Demetrios ball gowns at Areti, Sofia.",
    meta_bg: "Булчински рокли принцеса в София — корсет и обемна пола за класическа визия. Оригинални модели Demetrios, цени от 1 000 €.",
    meta_en: "Princess ball gown wedding dresses in Sofia — fitted bodice, full skirt, classic look. Original Demetrios styles from €1,000.",
  },
  "a-siluet": {
    bg: "А-силует", en: "A-line",
    h1_bg: "Булчински рокли А-силует", h1_en: "A-Line Wedding Dresses",
    intro_bg: "Булчинската рокля с А-силует е прилепнала в горната част и плавно се разширява от талията надолу, оформяйки буквата „А“. Това е най-универсалният силует — балансиран, елегантен и ласкав за всяка фигура. В Арети това е най-голямата ни група модели Demetrios.",
    intro_en: "An A-line wedding dress is fitted through the top and flows out gently from the waist, forming an “A” shape. It is the most versatile silhouette — balanced, elegant and flattering on every body type. It is our largest group of Demetrios styles at Areti.",
    meta_bg: "Булчински рокли А-силует в София — най-универсалната кройка, ласкава за всяка фигура. Оригинални модели Demetrios, цени от 1 000 €.",
    meta_en: "A-line wedding dresses in Sofia — the most versatile cut, flattering on every figure. Original Demetrios styles from €1,000.",
  },
};

function SilhouetteSeo({ lang, setRoute, goSilhouette, slug, count }) {
  const isBg = lang === "bg";
  const data = SILHOUETTE_PAGES[slug];
  if (!data) return null;
  const others = Object.entries(SILHOUETTE_PAGES).filter(([s]) => s !== slug);
  return (
    <section style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 0" }}>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? `Защо да изберете рокля ${data.bg.toLowerCase()}?` : `Why choose a ${data.en.toLowerCase()} dress?`}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 16 }}>
        {isBg ? data.intro_bg : data.intro_en}
      </p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, fontSize: 14, color: "var(--ink-mute)" }}>
        <span>{count} {isBg ? "модела в салона" : "styles in store"}</span>
        <span>{isBg ? "Цени от 1 000 €" : "Prices from €1,000"}</span>
        <span>{isBg ? "Оригинални Demetrios" : "Original Demetrios"}</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        <button className="btn btn-solid" onClick={() => setRoute("booking")}>
          {isBg ? "Запази проба →" : "Book a fitting →"}
        </button>
        <button className="btn" onClick={() => setRoute("collection")}>
          {isBg ? "Всички булчински рокли" : "All wedding dresses"}
        </button>
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        <strong>{isBg ? "Други силуети:" : "Other silhouettes:"}</strong>{" "}
        {others.map(([s, d], i) => (
          <span key={s}>
            <a href={withLang(`/collection/silueti/${s}`, lang)} onClick={(e) => { e.preventDefault(); goSilhouette && goSilhouette(s); }} style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>
              {isBg ? d.h1_bg : d.h1_en}
            </a>{i < others.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>
    </section>
  );
}


// -----------------------------------------------------------------------------
//  Evening / prom SEO content — only rendered on /collection/evening.
//  CollectionSeoContent covers the bridal hub, but the evening collection had
//  just its intro paragraph (~430 words total) while ranking for a cluster with
//  300+ monthly impressions and a weak CTR: "бална рокля" (singular — 161
//  impressions at ~1%), "официални рокли софия", "абитуриентски рокли".
//  The copy below deliberately uses BOTH the singular and plural forms, which
//  the plural-only headings never matched.
// -----------------------------------------------------------------------------
const EVENING_FAQ = {
  bg: [
    { q: "Колко струва бална рокля в София?", a: "Цените на балните и абитуриентските рокли в Арети зависят от модела и изработката — попитайте при запазване на час, тъй като наличностите се сменят всеки сезон. В цената влизат консултация със стилист и проба без ограничение в броя модели." },
    { q: "Кога да си избера абитуриентска рокля?", a: "Препоръчваме 3–4 месеца преди бала. Най-желаните модели и размери се изчерпват първи, а за корекции по фигурата трябват още 1–2 седмици. За балове през май–юни най-спокойно е да дойдете през февруари." },
    { q: "Каква бална рокля отива на фигурата ми?", a: "А-силуетът е универсален и ласкае почти всяка фигура. Русалката подчертава извивките и е за тези, които искат по-смела визия. Принцесата акцентира талията и създава обем. Най-добре е да пробвате и трите на живо — разликата се усеща веднага." },
    { q: "Правите ли корекции на официалните рокли?", a: "Да — корекциите се извършват в ателието на място, от същата шивачка, която работи по булчинските рокли. Скъсяване, стесняване или промяна на презрамките отнемат 1–2 седмици." },
    { q: "Подходящи ли са роклите за сватба като гостенка?", a: "Да. Голяма част от вечерната колекция е подходяща за сватба като гостенка, кръщене или официална вечеря — по-дискретни цветове и кройки, които не конкурират булката." },
  ],
  en: [
    { q: "How much does a prom dress cost in Sofia?", a: "Prices for prom and evening dresses at Areti depend on the style and craftsmanship — ask when booking, as stock changes each season. Every price includes a stylist consultation and unlimited try-ons." },
    { q: "When should I choose my prom dress?", a: "We recommend 3–4 months before the ball. The most popular styles and sizes go first, and alterations need another 1–2 weeks. For May–June proms, February is the comfortable time to come in." },
    { q: "Which evening dress suits my figure?", a: "The A-line is universal and flatters almost every figure. The mermaid accentuates curves for a bolder look. The ball gown emphasises the waist and adds volume. Trying all three in person is the fastest way to tell." },
    { q: "Do you alter evening dresses?", a: "Yes — alterations are done in our own atelier by the same seamstress who works on the bridal gowns. Shortening, taking in or adjusting straps takes 1–2 weeks." },
    { q: "Are these dresses suitable as a wedding guest?", a: "Yes. Much of the evening collection works for weddings as a guest, christenings or formal dinners — more discreet colours and cuts that never compete with the bride." },
  ],
};

function EveningSeoContent({ lang, setRoute }) {
  const isBg = lang === "bg";
  const [faqOpen, setFaqOpen] = useState({});
  const isPrerender = typeof window !== 'undefined' && window.__PRERENDER__;
  const faq = EVENING_FAQ[isBg ? "bg" : "en"];

  const occasions = isBg ? [
    { t: "Абитуриентски бал", d: "Най-снимания ден от гимназията. Дълга бална рокля с ефектен гръб или деколте — визия, която ще гледате на снимките години напред." },
    { t: "Сватба като гостенка", d: "Официална рокля в по-дискретен цвят, която изглежда празнично, без да конкурира булката." },
    { t: "Кръщене и семеен празник", d: "Елегантна, по-сдържана кройка, удобна за цял ден сред близките." },
    { t: "Коктейл и корпоративно събитие", d: "По-къса или права рокля с чист силует — официална, но не тържествена." },
  ] : [
    { t: "Prom night", d: "The most photographed evening of school. A long gown with a striking back or neckline — a look you will be seeing in photos for years." },
    { t: "Wedding guest", d: "A formal dress in a discreet colour that feels celebratory without competing with the bride." },
    { t: "Christening or family celebration", d: "An elegant, more restrained cut that stays comfortable through a long day." },
    { t: "Cocktail and corporate events", d: "A shorter or column dress with a clean silhouette — formal, but not ceremonial." },
  ];

  return (
    <section className="collection-seo">
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 12 }}>
        {isBg ? "Как да изберете бална рокля" : "How to choose an evening dress"}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginBottom: 24 }}>
        {isBg
          ? "Изборът на бална рокля започва от силуета, а не от цвета. А-силуетът е най-универсален и ласкае почти всяка фигура; русалката подчертава извивките; принцесата акцентира талията и създава обем. След това идват тъканта и детайлите — сатенът изглежда по-плътен и структуриран, тюлът с мъниста улавя светлината, дантелата придава мекота. В салона можете да пробвате неограничен брой модели, а корекциите се правят на място в ателието."
          : "Choosing an evening dress starts with the silhouette, not the colour. The A-line is the most universal and flatters almost every figure; the mermaid accentuates curves; the ball gown emphasises the waist and adds volume. Fabric and detail come next — satin reads denser and more structured, beaded tulle catches the light, lace softens the line. You can try on as many styles as you like, and alterations happen in our own atelier."}
      </p>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 20, marginTop: 40 }}>
        {isBg ? "За какви поводи" : "For which occasions"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 16 }}>
        {occasions.map(o => (
          <div key={o.t} style={{ background: "var(--surface)", padding: "18px 20px", borderRadius: 8 }}>
            <h3 style={{ fontFamily: "var(--f-serif)", fontSize: 18, fontWeight: 400, marginBottom: 8 }}>{o.t}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{o.d}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginTop: 24 }}>
        {isBg ? "Търсите булчинска, а не официална рокля? " : "Looking for a wedding dress rather than a formal one? "}
        <a href={isBg ? "/collection" : "/en/collection"} onClick={(e) => { e.preventDefault(); setRoute("collection"); }} style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 4 }}>
          {isBg ? "Вижте булчинската колекция →" : "See the bridal collection →"}
        </a>
        {isBg ? " Или направете " : " Or take the "}
        <a href={isBg ? "/kviz" : "/en/kviz"} onClick={(e) => { e.preventDefault(); setRoute("quiz"); }} style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 4 }}>
          {isBg ? "безплатния тест за силует →" : "free silhouette quiz →"}
        </a>
      </p>

      <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, marginBottom: 20, marginTop: 48 }}>
        {isBg ? "Често задавани въпроси" : "Frequently asked questions"}
      </h2>
      <div className="collection-faq">
        {faq.map(({ q, a }, i) => (
          <details key={q} open={isPrerender || !!faqOpen[i]} onToggle={(e) => { const isOpen = e.currentTarget?.open ?? e.target?.open ?? false; setFaqOpen(o => ({ ...o, [i]: isOpen })); }}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CollectionPage({ lang, setRoute, initCollection = null, initSilhouette = null, goSilhouette, favorites = [], toggleFavorite, goProduct }) {
  const t = i18n[lang];
  const isBg = lang === "bg";
  const colData = initCollection ? COLLECTIONS.find(c => c.id === initCollection) : null;
  const silData = initSilhouette ? SILHOUETTE_PAGES[initSilhouette] : null;
  const silName = silData ? (isBg ? silData.bg : silData.en) : null;
  const silCount = silData ? DRESSES.filter(d => d.silhouette === silData.bg).length : 0;
  const isEvening = initCollection === "evening";
  // CTR-optimized titles: pages already earn impressions, but generic titles
  // win few clicks (GSC: /collection/demetrios 1% CTR at 506 impressions).
  // Numbers + price anchors + concrete benefit lift SERP click-through.
  const colCount = initCollection ? DRESSES.filter(d => d.collection === initCollection).length : DRESSES.length;
  const CTR_TITLES = {
    bg: {
      demetrios:   `Булчински рокли Demetrios — ${colCount} модела от 1 500 € | Арети София`,
      cosmobella:  `Булчински рокли Cosmobella — цени от 1 000 € | Арети София`,
      platinum:    `Луксозни булчински рокли Platinum от 2 500 € | Арети София`,
      destination: `Сватбени рокли Destination Romance — бохо и плажна сватба | Арети`,
    },
    en: {
      demetrios:   `Demetrios Wedding Dresses — ${colCount} styles from €1,500 | Areti Sofia`,
      cosmobella:  `Cosmobella Wedding Dresses — prices from €1,000 | Areti Sofia`,
      platinum:    `Luxury Platinum Wedding Dresses from €2,500 | Areti Sofia`,
      destination: `Destination Romance Wedding Dresses — boho & beach | Areti`,
    },
  };
  useSeo({
    title: silData
      ? (isBg ? `${silData.h1_bg} в София — ${silCount} модела Demetrios | Арети` : `${silData.h1_en} in Sofia — ${silCount} Demetrios styles | Areti`)
      : isEvening
      ? (isBg ? "Абитуриентски и бални рокли в София — вечерна колекция | Арети" : "Prom & Evening Dresses in Sofia | Areti")
      : colData
        ? ((CTR_TITLES[isBg ? "bg" : "en"] || {})[initCollection] || (isBg ? `Луксозни булчински рокли ${colData.label} в София | Арети` : `Luxury ${colData.label} Wedding Dresses in Sofia | Areti`))
        : (isBg ? "Булчински рокли София — 100+ модела, цени от 1 000 € | Арети" : "Wedding Dresses Sofia — 100+ styles from €1,000 | Areti"),
    description: silData
      ? (isBg ? silData.meta_bg : silData.meta_en)
      : isEvening
      ? (isBg
          ? `Абитуриентски, бални и официални рокли в София — ${colCount} модела в салон Арети. Проба по предварителен час, корекции на място.`
          : `Prom, ball and formal dresses in Sofia — ${colCount} styles at Areti. Fitting by appointment, in-house alterations.`)
      : colData
        ? (isBg ? (colData.seo_desc_bg || colData.desc_bg) : (colData.seo_desc_en || colData.desc_en))
        : (isBg
            ? "Над 100 булчински и сватбени рокли в София — цени от 1 000 до 4 000 €. Demetrios, Cosmobella, Platinum, Destination Romance. Проба по час в Арети."
            : "Over 100 wedding dresses in Sofia — from €1,000 to €4,000. Demetrios, Cosmobella, Platinum, Destination Romance. Fittings at Areti."),
    image: DRESSES[0]?.imgs?.[0] || DRESSES[0]?.img,
    url: silData ? `/collection/silueti/${initSilhouette}` : initCollection ? `/collection/${initCollection}` : "/collection",
    lang,
    keywords: silData
      ? (isBg ? `булчинска рокля ${silData.bg.toLowerCase()}, ${silData.bg.toLowerCase()} булчински рокли София, Demetrios` : `${silData.en.toLowerCase()} wedding dress, ${silData.en.toLowerCase()} bridal Sofia`)
      : "колекции булчински рокли, Demetrios, Cosmobella, Platinum, Destination Romance, сватбени рокли София",
    jsonLd: { "@graph": [
      breadcrumbSchema([
        { name: isBg ? "Начало" : "Home", url: "/" },
        { name: isBg ? "Колекция" : "Collection", url: "/collection" },
        ...(colData ? [{ name: colData.label, url: `/collection/${colData.id}` }] : []),
        ...(silData ? [{ name: isBg ? silData.h1_bg : silData.h1_en, url: `/collection/silueti/${initSilhouette}` }] : []),
      ]),
      collectionItemListSchema(
        (silData ? DRESSES.filter(d => d.silhouette === silData.bg)
          : initCollection ? DRESSES.filter(d => d.collection === initCollection)
          : DRESSES),
        lang,
      ),
      ...(!initCollection && !silData ? [faqSchema(COLLECTION_FAQ[lang] || COLLECTION_FAQ.bg)] : []),
      // Evening collection has its own FAQ block on the page — declare it too.
      ...(initCollection === "evening" ? [faqSchema(EVENING_FAQ[lang] || EVENING_FAQ.bg)] : []),
    ]},
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("new");
  const [activeCol, setActiveCol] = useState(initCollection);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [gridCols, setGridCols] = useState(isMobile ? 2 : 2);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  useEffect(() => { setActiveCol(initCollection); }, [initCollection]);

  // Reset pagination whenever the tab / filters / sort change
  useEffect(() => { setVisibleCount(INITIAL_PAGE_SIZE); }, [activeCol, filters, sortBy]);

  // Build cross-collection ordered list:
  // When a specific collection is selected, continue into subsequent collections
  // so the "Виж още" button flows naturally across all collections.
  const displayList = useMemo(() => {
    // Silhouette landing page: show every dress with this silhouette, in
    // collection order, then apply any extra user filters/sort on top.
    if (silData) {
      const ordered = COLLECTIONS.flatMap(c => DRESSES.filter(d => d.collection === c.id && d.silhouette === silData.bg));
      return applyFiltersAndSort(ordered, filters, sortBy);
    }
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
  }, [activeCol, filters, sortBy, initSilhouette]);

  // How many dresses the heading is actually talking about. NOT displayList —
  // that intentionally continues into the following collections so "Виж още"
  // flows on, which would have the Demetrios page claim 99 styles instead of 53.
  const headingCount = silData
    ? DRESSES.filter(d => d.silhouette === silData.bg).length
    : activeCol
      ? DRESSES.filter(d => d.collection === activeCol).length
      : DRESSES.length;

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
          {/* The H1 used to be the bare collection name — "Demetrios",
              "Cosmobella", "Вечерни рокли" — on all five collection pages. The
              title carried the keywords and the strongest heading on the page
              carried none of them. */}
          <h1>
            {silData ? (isBg ? silData.h1_bg : silData.h1_en)
              : activeCol === "evening"
                ? (isBg ? <>Вечерни, бални и <em>абитуриентски</em> рокли</> : <>Evening, prom and <em>formal</em> dresses</>)
              : activeColData
                ? (isBg ? <>Булчински рокли <em>{collectionLabel(activeColData, lang)}</em></>
                        : <><em>{collectionLabel(activeColData, lang)}</em> wedding dresses</>)
              : (isBg ? <>Булчински и сватбени рокли <em>София</em></> : <>Wedding Dresses in <em>Sofia</em></>)}
          </h1>
          {silData ? (
            <p className="collection-intro">
              {isBg ? silData.intro_bg : silData.intro_en}{' '}
              <a href={withLang("/collection", lang)} onClick={(e) => { e.preventDefault(); setRoute("collection"); }} style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>
                {isBg ? "Вижте всички булчински рокли →" : "See all wedding dresses →"}
              </a>
            </p>
          ) : activeColData ? (
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

      {!silData && (
        <div className="collection-tabs">
          <button className={`col-tab ${!activeCol ? 'active' : ''}`} onClick={() => setActiveCol(null)}>
            {isBg ? 'Всички' : 'All'}
          </button>
          {COLLECTIONS.map(c => (
            <button key={c.id} className={`col-tab ${activeCol === c.id ? 'active' : ''}`} onClick={() => setActiveCol(c.id)}>
              {collectionLabel(c, lang)}
            </button>
          ))}
        </div>
      )}

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

      {/* Section heading for the grid.
          The page went <h1> straight to the <h3> of each dress card, skipping a
          level — an outline that assistive tech reads as broken, and a page
          with no <h2> at all on the site's most important commercial URL. This
          is also the natural place for the "N модела" count and the collection
          or silhouette name. */}
      {/* The H1 above now names the collection, so this says something the H1
          does not: how many, and where. */}
      <h2 className="grid-heading">
        {isBg ? `${headingCount} модела` : `${headingCount} styles`}
        <span className="grid-heading-count">
          {isBg ? " в салона в София" : " at the Sofia showroom"}
        </span>
      </h2>

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

      {!initCollection && !silData && <CollectionSeoContent lang={lang} setRoute={setRoute} goSilhouette={goSilhouette} />}
      {initCollection === "evening" && <EveningSeoContent lang={lang} setRoute={setRoute} />}
      {initCollection && <SubCollectionSeo lang={lang} setRoute={setRoute} colId={initCollection} />}
      {silData && <SilhouetteSeo lang={lang} setRoute={setRoute} goSilhouette={goSilhouette} slug={initSilhouette} count={silCount} />}

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
                      {collectionLabel(c, lang)}
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
            <div style={{ height: 1, background: "var(--rule)", flex: 1 }} aria-hidden="true" />
            {/* Was a <span>: it looked like a heading and read like one, but
                gave the outline nothing between the page h1 and the card h3s. */}
            <h2 style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(14px, 1.5vw, 18px)", fontWeight: 400, color: "var(--ink-soft)", whiteSpace: "nowrap", padding: "0 20px", margin: 0 }}>
              {colData ? collectionLabel(colData, lang) : d.collection}
            </h2>
            <div style={{ height: 1, background: "var(--rule)", flex: 1 }} aria-hidden="true" />
          </div>
        </div>
      );
    }
    lastCol = d.collection;
    rows.push(
      <DressCard key={d.ref} d={d} lang={lang} onClick={() => goProduct(d.ref)} isFav={favorites.includes(d.ref)} toggleFavorite={toggleFavorite} />
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

// Related products for the "you may also like" block. Prefers the same
// collection + silhouette, then same collection, then the rest — and rotates
// the tie-break by the current ref so different products surface different
// neighbours. This spreads internal-link equity across the whole catalogue
// (helping thin product pages get crawled & indexed) instead of always linking
// the same first four dresses on every single product page.
function refSeed(ref) {
  return String(ref).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
}
function getRelatedDresses(current, count = 4) {
  const seed = refSeed(current.ref);
  return DRESSES
    .filter(d => d.ref !== current.ref)
    .map(d => ({
      d,
      rel: (d.collection === current.collection ? 2 : 0) + (d.silhouette === current.silhouette ? 1 : 0),
      spread: (refSeed(d.ref) ^ seed) >>> 0,
    }))
    .sort((a, b) => b.rel - a.rel || a.spread - b.spread)
    .slice(0, count)
    .map(x => x.d);
}

function ProductPage({ lang, setRoute, productRef, favorites = [], toggleFavorite, goBooking, goProduct }) {
  const t = i18n[lang];
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const dress = DRESSES.find(d => d.ref === productRef) || DRESSES[0];
  const isFav = favorites.includes(dress.ref);
  const isBg = lang === "bg";
  const heading = getProductHeading(dress, lang);
  const cardName = `Style ${dress.ref}`;
  const productDescription = buildProductDescription(dress, lang) || t.product.desc;
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
    // Attribute-based title (silhouette + fabric), not the stored seo_title_*
    // templates — see buildProductTitle for why.
    title: buildProductTitle(dress, lang),
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
          <a href={withLang("/", lang)} onClick={(e) => { e.preventDefault(); setRoute("home"); }} style={{ cursor: "pointer" }}>Areti</a>
          <a href={withLang("/collection", lang)} onClick={(e) => { e.preventDefault(); setRoute("collection"); }} style={{ cursor: "pointer" }}>{t.product.crumb_back}</a>
          <span style={{ color: "var(--ink)" }}>{cardName}</span>
        </div>
        <div className="product-main">
          <div className="product-gallery">
            <Img src={galleryImgs[0]} alt={getProductAlt(dress, lang, 0)} className="main-img" style={{ cursor: "zoom-in" }} priority width={1200} height={1600} sizes="(max-width: 768px) 100vw, 55vw" />
            {galleryImgs.slice(1, 4).map((imgSrc, i) => (
              <Img key={i} src={imgSrc} alt={getProductAlt(dress, lang, i + 1)} className="thumb" style={{ cursor: "zoom-in" }} width={600} height={800} />
            ))}
            {galleryImgs.length > 4 && (
              <div className="thumb" style={{ background: "var(--bg-deep)", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => setLightboxIdx(0)}>
                <span style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ink-soft)" }}>+ {galleryImgs.length - 4} {isBg ? "снимки" : "photos"}</span>
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
            {getRelatedDresses(dress, 4).map((d) => (
              <DressCard key={d.ref} d={d} lang={lang} onClick={() => { goProduct && goProduct(d.ref); window.scrollTo(0, 0); }} isFav={favorites.includes(d.ref)} toggleFavorite={toggleFavorite} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="btn" onClick={() => setRoute("collection")}>
              {lang === "bg" ? "Виж цялата колекция" : "View full collection"} <span style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>→</span>
            </button>
          </div>
        </section>

        {(() => {
          // The blog is Bulgarian-only, so this block is hidden on /en pages —
          // surfacing untranslated articles there would send English visitors
          // to Bulgarian content and dilute the English locale.
          if (!isBg) return null;
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

export { CollectionPage, ProductPage, WishlistPage };
