import React, { useState } from 'react';
import i18n from './i18n';
import { IMG, DRESSES, COLLECTIONS } from './data';
import { Img } from './components';
import { useSeo, orgSchema, websiteSchema } from './seo';
import { getProductCardName, getProductAlt } from './seo-helpers';

// =====================================================
//  HOME — 3 hero variations + shared sections
// =====================================================

function HomeHeroV1({ t, setRoute }) {
  return (
    <section className="hero hero-v1">
      <div className="hero-bg" style={{ backgroundImage: `url(${IMG.hero1})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
      <div className="hero-content">
        <div className="top-strip fade-in">
          <span>{t.home.tagline_top_left}</span>
          <span>{t.home.tagline_top_right}</span>
        </div>
        <h1 className="t-display fade-up">
          АРЕТИ
          <em>forever</em>
        </h1>
        <div className="bottom-strip fade-up delay-2">
          <p className="tag">{t.home.lede}</p>
          <div className="hero-v1-ctas">
            <button className="btn btn-light" onClick={() => setRoute("collection")}>
              {t.home.view_all} <span style={{ fontFamily: "var(--f-serif)", fontSize: 18 }}>→</span>
            </button>
            <button className="btn btn-outline hero-v1-book" onClick={() => setRoute("booking")}>
              {t.home.cta_band_btn} →
            </button>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.85 }}>
            <div>Demetrios</div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 13, fontStyle: "italic", letterSpacing: "0.05em", textTransform: "none", marginTop: 4 }}>Арети · колекция 2026 · София</div>
          </div>
        </div>
      </div>
      <div className="hero-scroll" style={{ color: "var(--bg)" }}>
        <span>{t.home.scroll}</span>
        <span className="line"></span>
      </div>
    </section>
  );
}

function HomeHeroV2({ t, lang, setRoute }) {
  return (
    <section className="hero-v2">
      <div className="hero-img" style={{ backgroundImage: `url(${IMG.hero2})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
      <div className="hero-text">
        <div className="issue fade-in">
          <span>VOL. XII</span>
          <span className="dot"></span>
          <span>SPRING 2026</span>
          <span className="dot"></span>
          <span>SOFIA</span>
        </div>
        <div className="fade-up delay-1" style={{ marginTop: 60 }}>
          <h1 className="t-display">
            АРЕТИ
            <em>София.</em>
          </h1>
          <h2 className="hero-kw">{t.home.hero_kw}</h2>
          <p className="lede">{t.home.lede}</p>
        </div>
        <div className="meta-row fade-up delay-3">
          <div className="meta-stack">
            <span style={{ fontFamily: "var(--f-serif)", fontSize: 22, fontStyle: "italic" }}>Колекция Demetrios 2026</span>
            <span className="t-meta">{t.home.hero_meta}</span>
          </div>
          <button className="btn btn-solid" onClick={() => setRoute("collection")}>
            {t.home.view_all}
          </button>
        </div>
      </div>
    </section>
  );
}

function HomeHeroV3({ t, setRoute }) {
  return (
    <section className="hero hero-v3">
      <div className="hero-bg" style={{ backgroundImage: `url(${IMG.hero3})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
      <div className="hero-content">
        <div className="top-strip fade-in" style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", opacity: 0.85 }}>
          <span>—— Atelier Areti</span>
          <span>The Bridal Edit · 2026</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <h1 className="marquee fade-up">
          АРЕТИ <em>noir.</em>
        </h1>
        <div className="v3-row fade-up delay-2">
          <p>{t.home.lede}</p>
          <div>
            <div className="v3-num">12</div>
            <span>silhouettes · demetrios</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <button className="btn btn-light" onClick={() => setRoute("collection")}>
              {t.home.view_all}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionPreview({ t, setRoute, lang, favorites = [], toggleFavorite, goProduct }) {
  const [activeCol, setActiveCol] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const dresses = activeCol
    ? DRESSES.filter(d => d.collection === activeCol).slice(0, 6)
    : DRESSES.slice(0, 6);

  const activeColData = COLLECTIONS.find(c => c.id === activeCol);
  const activeLabel = activeColData ? activeColData.label : (lang === "bg" ? "Всички колекции" : "All collections");

  const pick = (id) => { setActiveCol(id); setSelectorOpen(false); };

  return (
    <section className="section">
      <div className="sec-head">
        <div className="left">{t.home.collection_meta_left}</div>
        <h2>
          <span style={{ display: "block", fontSize: "0.42em", letterSpacing: "0.4em", color: "var(--ink-mute)", textTransform: "uppercase", marginBottom: 16 }}>
            {activeColData ? activeColData.label : t.home.collection_eye}
          </span>
          {t.home.collection_title} <em>{activeColData ? activeColData.label.split(" ")[0].toLowerCase() : t.home.collection_title_em}</em>
        </h2>
        <div className="right">{t.home.collection_meta_right}</div>
      </div>

      {/* Desktop tabs */}
      <div className="preview-tabs-wrap">
        <div className="preview-tabs">
          <button className={`preview-tab ${!activeCol ? "active" : ""}`} onClick={() => pick(null)}>
            {lang === "bg" ? "Всички" : "All"}
          </button>
          {COLLECTIONS.map(c => (
            <button key={c.id} className={`preview-tab ${activeCol === c.id ? "active" : ""}`} onClick={() => pick(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile selector */}
      <div className="col-selector-wrap">
        <button className="col-selector-btn" onClick={() => setSelectorOpen(o => !o)}>
          <span className="col-selector-label">{activeLabel}</span>
          <svg className={`col-selector-chev ${selectorOpen ? "open" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="16" height="16">
            <polyline points="4,7 10,13 16,7"/>
          </svg>
        </button>
        {selectorOpen && (
          <div className="col-selector-drop">
            <div className={`col-selector-opt ${!activeCol ? "active" : ""}`} onClick={() => pick(null)}>
              <span>{lang === "bg" ? "Всички колекции" : "All collections"}</span>
              {!activeCol && <span className="col-sel-check">✓</span>}
            </div>
            {COLLECTIONS.map(c => (
              <div key={c.id} className={`col-selector-opt ${activeCol === c.id ? "active" : ""}`} onClick={() => pick(c.id)}>
                <div>
                  <div className="col-sel-name">{c.label}</div>
                  <div className="col-sel-desc">{lang === "bg" ? c.desc_bg.split("—")[0] : c.desc_en.split(".")[0]}</div>
                </div>
                {activeCol === c.id && <span className="col-sel-check">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dress-grid">
        {dresses.map((d) => (
          <DressCard key={d.ref} d={d} lang={lang} onClick={() => goProduct ? goProduct(d.ref) : setRoute("product")} favorites={favorites} toggleFavorite={toggleFavorite} />
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <button className="btn" onClick={() => setRoute("collection")}>
          {t.home.view_all} <span style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>→</span>
        </button>
      </div>
    </section>
  );
}

function DressCard({ d, lang, onClick, favorites = [], toggleFavorite }) {
  const t = i18n[lang];
  const name = getProductCardName(d, lang);
  const sil = lang === "bg" ? d.silhouette : d.silhouette_en;
  const isFav = favorites.includes(d.ref);
  const imgAlt = getProductAlt(d, lang, 0);
  return (
    <article className="dress-card" onClick={onClick}>
      {d.badge && <span className="badge">{d.badge}</span>}
      {toggleFavorite && (
        <button
          className={`fav-btn ${isFav ? "on" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(d.ref); }}
          aria-label="Добави в любими"
        >
          <svg viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      )}
      <Img src={d.img} alt={imgAlt} className="dress-img" width={600} height={800} />
      <span className="quick">View · {d.ref}</span>
      <div className="dress-info">
        <div>
          <h3>{name}</h3>
          <div className="meta">{sil} · {d.fabric}</div>
        </div>
        {d.price > 0 && <div className="price">{t.common.from} {d.price.toLocaleString(lang === "bg" ? "bg-BG" : "en-US")} {t.common.bgn}</div>}
      </div>
    </article>
  );
}

function StorySection({ t, setRoute }) {
  return (
    <section className="section">
      <div className="editorial">
        <div>
          <Img src="/images/atelier-story.webp" alt="Сватбен салон Арети — интериор на бутика в София, булчински рокли Demetrios" className="editorial-img" width={900} height={1100} />
        </div>
        <div className="editorial-content">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.home.story_eye}</div>
          <h3>{t.home.story_title} <em>{t.home.story_title_em}</em></h3>
          <p>{t.home.story_p1}</p>
          <p>{t.home.story_p2}</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setRoute("about")}>
            {t.home.story_cta} →
          </button>
        </div>
      </div>
    </section>
  );
}

function ServicesSection({ t }) {
  const items = [
    { title: t.home.service_1_title, desc: t.home.service_1_desc, num: "01" },
    { title: t.home.service_2_title, desc: t.home.service_2_desc, num: "02" },
    { title: t.home.service_3_title, desc: t.home.service_3_desc, num: "03" },
  ];
  return (
    <section className="section section-tight" style={{ background: "var(--bg-soft)", maxWidth: "100%" }}>
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div className="sec-head">
          <div className="left">— Услугата</div>
          <h2>
            <span className="t-eyebrow" style={{ display: "block", marginBottom: 14 }}>{t.home.services_eye}</span>
            {t.home.services_title} <em>{t.home.services_title_em}</em>
          </h2>
          <div className="right">III · процеса</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, borderTop: "1px solid var(--rule)" }}>
          {items.map((s, i) => (
            <div key={i} style={{ padding: "48px 28px", borderRight: i < 2 ? "1px solid var(--rule)" : "0", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "var(--f-display)", fontSize: 56, color: "var(--champagne-deep)", lineHeight: 0.9 }}>{s.num}</div>
              <h4 style={{ fontFamily: "var(--f-serif)", fontSize: 28, fontWeight: 400, lineHeight: 1.15 }}>{s.title}</h4>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: 16, lineHeight: 1.5, color: "var(--ink-soft)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarqueeStrip() {
  const items = ["Булчински рокли", "2026 Demetrios", "Ръчна изработка", "София", "Булчински рокли", "2026 Demetrios", "Ръчна изработка", "София"];
  return (
    <div className="marquee-strip">
      <div className="marquee-track">
        {items.map((x, i) => (
          <React.Fragment key={i}>
            <span>{i % 2 ? <em>{x}</em> : x}</span>
            <span className="sep"></span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function PriceRangesSection({ t, lang, setRoute }) {
  const ranges = [
    {
      name: "Cosmobella",
      range: "1 000 – 1 700 €",
      desc: lang === "bg" ? "Модерна и смела — за булката с индивидуален стил." : "Modern and bold — for the bride with individual style.",
      id: "cosmobella",
    },
    {
      name: "Demetrios",
      range: "1 300 – 2 500 €",
      desc: lang === "bg" ? "Класическа и елегантна булчинска линия." : "Classic and elegant bridal line.",
      id: "demetrios",
    },
    {
      name: "Destination",
      range: "1 000 – 1 400 €",
      desc: lang === "bg" ? "Романтични рокли за сватба навсякъде по света." : "Romantic gowns for a wedding anywhere in the world.",
      id: "destination",
    },
    {
      name: "Platinum",
      range: "2 500 – 4 000 €",
      desc: lang === "bg" ? "Луксозна серия с богата бродерия и кристали." : "Luxury series with rich embroidery and crystals.",
      id: "platinum",
    },
  ];
  return (
    <section className="section section-tight" style={{ background: "var(--ink)", color: "var(--bg)", maxWidth: "100%" }}>
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="t-eyebrow" style={{ color: "var(--champagne)", marginBottom: 16 }}>— {lang === "bg" ? "Ценови диапазон" : "Price ranges"} —</div>
          <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(32px, 4vw, 56px)", color: "var(--bg)", fontWeight: 400 }}>
            {lang === "bg" ? "Колекции" : "Collections"}{" "}
            <em style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--champagne)" }}>
              {lang === "bg" ? "и цени" : "& prices"}
            </em>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: "rgba(255,255,255,0.08)" }}>
          {ranges.map((r) => (
            <div
              key={r.id}
              style={{ padding: "40px 32px", background: "var(--ink)", cursor: "pointer", transition: "background 0.2s" }}
              onClick={() => setRoute("collection")}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--ink)"}
            >
              <div style={{ fontFamily: "var(--f-serif)", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "var(--champagne)", marginBottom: 14 }}>{r.name}</div>
              <div style={{ fontFamily: "var(--f-display)", fontSize: "clamp(26px, 3vw, 42px)", color: "var(--bg)", lineHeight: 1, marginBottom: 14 }}>{r.range}</div>
              <div style={{ fontFamily: "var(--f-serif)", fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <button className="btn btn-light" onClick={() => setRoute("collection")}>
            {t.home.view_all} →
          </button>
        </div>
      </div>
    </section>
  );
}

function CtaBand({ t, setRoute }) {
  return (
    <section style={{ background: "var(--ink)", color: "var(--bg)", padding: "120px var(--gutter)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <div className="t-eyebrow" style={{ color: "var(--champagne)", marginBottom: 20 }}>— Запазване —</div>
        <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(56px, 7vw, 112px)", lineHeight: 0.95, marginBottom: 28 }}>
          {t.home.cta_band.split(" ").slice(0, 2).join(" ")}{" "}
          <em style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--champagne)" }}>
            {t.home.cta_band.split(" ").slice(2).join(" ")}
          </em>
        </h2>
        <button className="btn btn-light" onClick={() => setRoute("booking")} style={{ marginTop: 16 }}>
          {t.home.cta_band_btn} →
        </button>
      </div>
    </section>
  );
}

function HomePage({ lang, setRoute, heroVariant, favorites = [], toggleFavorite, goProduct }) {
  const t = i18n[lang];
  const Hero = heroVariant === "split" ? HomeHeroV2 : heroVariant === "noir" ? HomeHeroV3 : HomeHeroV1;
  useSeo({
    title: lang === "bg"
      ? "Арети — Bridal Couture · Официален представител на Demetrios в София"
      : "Areti — Bridal Couture · Official Demetrios Representative in Sofia",
    description: lang === "bg"
      ? "Луксозни булчински рокли в София. Арети — официален представител на Demetrios от 1992 г. Колекциите Demetrios, Cosmobella, Platinum и Destination Romance. Запазете час за безплатна проба."
      : "Luxury wedding dresses in Sofia. Areti — official Demetrios representative since 1992. Demetrios, Cosmobella, Platinum and Destination Romance collections. Book a free fitting.",
    image: IMG.hero1,
    url: "/",
    lang,
    keywords: "булчински рокли, сватбени рокли, Demetrios, София, Арети, bridal Sofia, wedding dresses Bulgaria",
    jsonLd: { "@graph": [orgSchema(), websiteSchema()] },
    jsonLdId: "home",
  });
  return (
    <div className="page-enter">
      <Hero t={t} lang={lang} setRoute={setRoute} />
      <CollectionPreview t={t} setRoute={setRoute} lang={lang} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />
      <MarqueeStrip />
      <StorySection t={t} setRoute={setRoute} />
      <PriceRangesSection t={t} lang={lang} setRoute={setRoute} />
      <ServicesSection t={t} />
      <CtaBand t={t} setRoute={setRoute} />
    </div>
  );
}

export { HomePage, DressCard };
