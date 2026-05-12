import React, { useState } from 'react';
import i18n from './i18n';
import { IMG, DRESSES, COLLECTIONS } from './data';
import { Img } from './components';

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
          <span>N°  XXVI</span>
          <span>{t.home.tagline_top_right}</span>
        </div>
        <h1 className="t-display fade-up">
          АРЕТИ
          <em>forever</em>
        </h1>
        <div className="bottom-strip fade-up delay-2">
          <p className="tag">{t.home.lede}</p>
          <button className="btn btn-light" onClick={() => setRoute("collection")}>
            {t.home.view_all} <span style={{ fontFamily: "var(--f-serif)", fontSize: 18 }}>→</span>
          </button>
          <div style={{ textAlign: "right", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.85 }}>
            <div>Romansa</div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 13, fontStyle: "italic", letterSpacing: "0.05em", textTransform: "none", marginTop: 4 }}>spring · 2026</div>
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

function HomeHeroV2({ t, setRoute }) {
  return (
    <section className="hero-v2">
      <div className="hero-img" style={{ backgroundImage: `url(${IMG.hero2})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
      <div className="hero-text">
        <div className="issue fade-in">
          <span>VOL. XII</span>
          <span className="dot"></span>
          <span>SPRING MMXXVI</span>
          <span className="dot"></span>
          <span>SOFIA</span>
        </div>
        <div className="fade-up delay-1" style={{ marginTop: 60 }}>
          <h1 className="t-display">
            АРЕТИ
            <em>с любов.</em>
          </h1>
          <p className="lede">{t.home.lede}</p>
        </div>
        <div className="meta-row fade-up delay-3">
          <div className="meta-stack">
            <span className="t-meta">In this issue</span>
            <span style={{ fontFamily: "var(--f-serif)", fontSize: 22, fontStyle: "italic" }}>The Romansa Collection</span>
            <span className="t-meta">12 silhouettes · от 2 800 лв.</span>
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
          <span>The Bridal Edit · MMXXVI</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <h1 className="marquee fade-up">
          АРЕТИ <em>noir.</em>
        </h1>
        <div className="v3-row fade-up delay-2">
          <p>{t.home.lede}</p>
          <div>
            <div className="v3-num">12</div>
            <span>silhouettes · romansa</span>
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

function CollectionPreview({ t, setRoute, lang, favorites = [], toggleFavorite }) {
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
          <DressCard key={d.ref} d={d} lang={lang} onClick={() => setRoute("product")} favorites={favorites} toggleFavorite={toggleFavorite} />
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
  const name = lang === "bg" ? d.name_bg : d.name_en;
  const sil = lang === "bg" ? d.silhouette : d.silhouette_en;
  const isFav = favorites.includes(d.ref);
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
      <Img src={d.img} label={name} className="dress-img" />
      <span className="quick">View · {d.ref}</span>
      <div className="dress-info">
        <div>
          <h3>{name}</h3>
          <div className="meta">{sil} · {d.fabric}</div>
        </div>
        <div className="price">{t.common.from} {d.price.toLocaleString("bg-BG")} лв.</div>
      </div>
    </article>
  );
}

function StorySection({ t, setRoute }) {
  return (
    <section className="section">
      <div className="editorial">
        <div>
          <Img src={IMG.about} label="atelier interior" className="editorial-img" />
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
  const items = ["Bridal Couture", "MMXXVI Romansa", "Hand-Stitched", "Sofia · Plovdiv", "Bridal Couture", "MMXXVI Romansa", "Hand-Stitched", "Sofia · Plovdiv"];
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

function HomePage({ lang, setRoute, heroVariant, favorites = [], toggleFavorite }) {
  const t = i18n[lang];
  const Hero = heroVariant === "split" ? HomeHeroV2 : heroVariant === "noir" ? HomeHeroV3 : HomeHeroV1;
  return (
    <div className="page-enter">
      <Hero t={t} setRoute={setRoute} />
      <CollectionPreview t={t} setRoute={setRoute} lang={lang} favorites={favorites} toggleFavorite={toggleFavorite} />
      <MarqueeStrip />
      <StorySection t={t} setRoute={setRoute} />
      <ServicesSection t={t} />
      <CtaBand t={t} setRoute={setRoute} />
    </div>
  );
}

export { HomePage, DressCard };
