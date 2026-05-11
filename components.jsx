// =====================================================
//  Shared components: Nav, Footer, Image placeholders
// =====================================================

const { useState, useEffect, useRef, useMemo } = React;

// ----- Image system (mix of stock URL + elegant fallback) -----
function useImageBg(src) {
  // returns inline style with image url; falls back to gradient placeholder if undefined
  if (!src) return {};
  return { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

function Img({ src, label, className = "", style = {} }) {
  // gracious image with built-in placeholder fallback
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={`ph ${className}`}
        data-label={label || "image"}
        style={style}
      ></div>
    );
  }
  return (
    <div
      className={`ph ph-img ${className}`}
      style={{ ...style, backgroundImage: `url(${src})` }}
      role="img"
      aria-label={label}
    >
      <img src={src} alt={label || ""} style={{ display: "none" }} onError={() => setErrored(true)} />
    </div>
  );
}

// ----- Nav -----
function Nav({ route, setRoute, lang, setLang, transparent }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = window.i18n[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const links = [
    { id: "collection", label: t.nav.collection },
    { id: "accessories", label: t.nav.accessories },
    { id: "about", label: t.nav.about },
    { id: "blog", label: t.nav.blog },
    { id: "contact", label: t.nav.contact },
    { id: "booking", label: t.nav.bookings },
  ];

  const goTo = (id) => {
    setDrawerOpen(false);
    setTimeout(() => setRoute(id), 80);
  };

  const cls = [
    "nav-bar",
    transparent && !scrolled && !drawerOpen ? "transparent" : "",
    scrolled || drawerOpen ? "scrolled" : "",
  ].join(" ");

  return (
    <>
      <nav className={cls}>
        <div className="nav-inner">
          <div className="nav-left">
            {links.slice(0, 3).map((l) => (
              <span key={l.id} className={`nav-link ${route === l.id ? "active" : ""}`} onClick={() => setRoute(l.id)}>{l.label}</span>
            ))}
          </div>
          <div className={`burger ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(!drawerOpen)}>
            <span></span><span></span><span></span>
          </div>
          <div className="brand-mark" onClick={() => { setDrawerOpen(false); setRoute("home"); }}>
            АРЕТИ
            <span className="sub">— BRIDAL · SOFIA —</span>
          </div>
          <div className="nav-right">
            {links.slice(3, 5).map((l) => (
              <span key={l.id} className={`nav-link ${route === l.id ? "active" : ""}`} onClick={() => setRoute(l.id)}>{l.label}</span>
            ))}
            <span className="nav-link" onClick={() => setRoute("booking")}>{t.nav.bookings}</span>
            <div className="lang-toggle">
              <button className={lang === "bg" ? "active" : ""} onClick={() => setLang("bg")}><span>BG</span></button>
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}><span>EN</span></button>
            </div>
          </div>
        </div>
      </nav>
      <div className={`mobile-drawer ${drawerOpen ? "open" : ""}`}>
        {links.map((l) => (
          <div key={l.id} className="m-link" onClick={() => goTo(l.id)}>
            <span>{l.label}</span>
            <span className="arr">→</span>
          </div>
        ))}
        <div className="m-foot">
          <span className="m-meta">EST · MMXIV</span>
          <div className="m-lang">
            <button className={lang === "bg" ? "active" : ""} onClick={() => setLang("bg")}>BG</button>
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ----- Footer -----
function Footer({ lang, setRoute }) {
  const t = window.i18n[lang].footer;
  return (
    <footer className="footer">
      <div className="inner">
        <div className="top">
          <div>
            <div className="brand-big">{t.brand}<em>{t.brand_em}</em></div>
            <p className="brand-tag">{t.tagline}</p>
            <div style={{ marginTop: 32, maxWidth: 320 }}>
              <h4>{t.newsletter}</h4>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: 14, opacity: 0.7, marginBottom: 16 }}>{t.newsletter_p}</p>
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,253,248,0.3)", paddingBottom: 8 }}>
                <input
                  type="email"
                  placeholder={t.newsletter_ph}
                  style={{ background: "transparent", border: 0, color: "var(--bg)", fontFamily: "var(--f-serif)", fontSize: 16, fontStyle: "italic", flex: 1, outline: "none" }}
                />
                <button style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--champagne)", padding: "4px 0", fontWeight: 500 }}>
                  {t.newsletter_btn} →
                </button>
              </div>
            </div>
          </div>
          <div>
            <h4>{t.shop}</h4>
            <ul>{t.shop_links.map((x, i) => <li key={i}><a onClick={() => setRoute(i === 0 ? "collection" : i === 2 ? "accessories" : "collection")}>{x}</a></li>)}</ul>
          </div>
          <div>
            <h4>{t.atelier}</h4>
            <ul>{t.atelier_links.map((x, i) => <li key={i}><a onClick={() => setRoute(i === 0 ? "about" : i === 1 ? "blog" : "about")}>{x}</a></li>)}</ul>
          </div>
          <div>
            <h4>{t.help}</h4>
            <ul>{t.help_links.map((x, i) => <li key={i}><a onClick={() => setRoute(i === 0 ? "booking" : i === 1 ? "contact" : "contact")}>{x}</a></li>)}</ul>
          </div>
        </div>
        <div className="bottom">
          <span>{t.copyright}</span>
          <span>{t.lang_marker}</span>
        </div>
      </div>
    </footer>
  );
}

// Stock-style image URLs (Unsplash photo IDs known to be stable, bridal/luxury themed)
window.IMG = {
  hero1: "https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=1800&q=80&auto=format",
  hero2: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1600&q=80&auto=format",
  hero3: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1800&q=80&auto=format",
  bride1: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=1200&q=80&auto=format",
  bride2: "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=1200&q=80&auto=format",
  bride3: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80&auto=format",
  bride4: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80&auto=format",
  bride5: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&auto=format",
  bride6: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80&auto=format",
  bride7: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80&auto=format",
  bride8: "https://images.unsplash.com/photo-1569714151049-7e1ad19fe8ea?w=1200&q=80&auto=format",
  bride9: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1200&q=80&auto=format",
  detail1: "https://images.unsplash.com/photo-1561125320-67b3ce6080a5?w=1000&q=80&auto=format",
  detail2: "https://images.unsplash.com/photo-1589476994384-b1ee3a2faabf?w=1000&q=80&auto=format",
  veil: "https://images.unsplash.com/photo-1563729627-2cc83a2c3d39?w=1000&q=80&auto=format",
  shoes: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=1000&q=80&auto=format",
  earrings: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1000&q=80&auto=format",
  crown: "https://images.unsplash.com/photo-1611601679762-0408a3a45cdc?w=1000&q=80&auto=format",
  about: "https://images.unsplash.com/photo-1606490194859-07c18c9f0968?w=1800&q=80&auto=format",
  blog: "https://images.unsplash.com/photo-1583939411023-14783179e581?w=1400&q=80&auto=format",
};

// Dress dataset
window.DRESSES = [
  { ref: "AR-001", name_bg: "Серена", name_en: "Serena", silhouette: "Сирена", silhouette_en: "Mermaid", price: 4800, img: window.IMG.bride1, badge: "MMXXVI", fabric: "Коприна, дантела" },
  { ref: "AR-002", name_bg: "Виола", name_en: "Viola", silhouette: "А-силует", silhouette_en: "A-line", price: 3900, img: window.IMG.bride2, fabric: "Коприна" },
  { ref: "AR-003", name_bg: "Орели", name_en: "Aurelie", silhouette: "Принцеса", silhouette_en: "Princess", price: 5400, img: window.IMG.bride3, badge: "Couture", fabric: "Тюл, мъниста" },
  { ref: "AR-004", name_bg: "Маре", name_en: "Mare", silhouette: "Прав", silhouette_en: "Column", price: 3200, img: window.IMG.bride4, fabric: "Сатен" },
  { ref: "AR-005", name_bg: "Лила", name_en: "Lila", silhouette: "Ампир", silhouette_en: "Empire", price: 2800, img: window.IMG.bride5, fabric: "Шифон" },
  { ref: "AR-006", name_bg: "Изабел", name_en: "Isabelle", silhouette: "Балон", silhouette_en: "Ball gown", price: 6200, img: window.IMG.bride6, badge: "Couture", fabric: "Тюл, дантела" },
  { ref: "AR-007", name_bg: "Колет", name_en: "Colette", silhouette: "Сирена", silhouette_en: "Mermaid", price: 4400, img: window.IMG.bride7, fabric: "Дантела" },
  { ref: "AR-008", name_bg: "Естер", name_en: "Esther", silhouette: "А-силует", silhouette_en: "A-line", price: 3600, img: window.IMG.bride8, fabric: "Коприна, тюл" },
  { ref: "AR-009", name_bg: "Афродита", name_en: "Aphrodite", silhouette: "Прав", silhouette_en: "Column", price: 3000, img: window.IMG.bride9, fabric: "Коприна" },
];

window.ACCESSORIES = [
  { name_bg: "Воал Клер", name_en: "Veil Claire", cat: "Воали", cat_en: "Veils", price: 480, img: window.IMG.veil },
  { name_bg: "Корона Аврора", name_en: "Aurora crown", cat: "Корони", cat_en: "Crowns", price: 920, img: window.IMG.crown },
  { name_bg: "Обици Перлен", name_en: "Pearl earrings", cat: "Обици", cat_en: "Earrings", price: 340, img: window.IMG.earrings },
  { name_bg: "Обувки Сатен", name_en: "Satin shoes", cat: "Обувки", cat_en: "Shoes", price: 680, img: window.IMG.shoes },
  { name_bg: "Воал Катедрал", name_en: "Cathedral veil", cat: "Воали", cat_en: "Veils", price: 620, img: window.IMG.detail1 },
  { name_bg: "Колан с мъниста", name_en: "Beaded belt", cat: "Колани", cat_en: "Belts", price: 280, img: window.IMG.detail2 },
  { name_bg: "Корона Зора", name_en: "Zora crown", cat: "Корони", cat_en: "Crowns", price: 760, img: window.IMG.bride6 },
  { name_bg: "Обици Висулка", name_en: "Drop earrings", cat: "Обици", cat_en: "Earrings", price: 420, img: window.IMG.bride5 },
];

Object.assign(window, { Nav, Footer, Img });
