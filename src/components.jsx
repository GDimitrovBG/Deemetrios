import { useState, useEffect, useRef } from 'react';
import i18n from './i18n';
import { COLLECTIONS } from './data';

// =====================================================
//  Shared components: Nav, Footer, Image placeholders
// =====================================================

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
    <div className={`ph ph-img ${className}`} style={style}>
      <img
        src={src}
        alt={label || ""}
        onError={() => setErrored(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
        loading="lazy"
      />
    </div>
  );
}

// ----- Nav -----
function Nav({ route, setRoute, lang, setLang, transparent, goCollection, favorites = [] }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [colHover, setColHover] = useState(false);
  const colHoverTimer = useRef(null);
  const t = i18n[lang];

  const showDrop = () => { clearTimeout(colHoverTimer.current); setColHover(true); };
  const hideDrop = () => { colHoverTimer.current = setTimeout(() => setColHover(false), 200); };

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
            <span className={`nav-link ${route === "home" ? "active" : ""}`} onClick={() => { setDrawerOpen(false); setRoute("home"); }}>{t.nav.home}</span>
            <div className="nav-has-drop" onMouseEnter={showDrop} onMouseLeave={hideDrop}>
              <span className={`nav-link ${route === "collection" ? "active" : ""}`} onClick={() => goCollection(null)}>
                {t.nav.collection}
              </span>
              {colHover && (
                <div className="nav-drop" onMouseEnter={showDrop} onMouseLeave={hideDrop}>
                  <div className="nd-item nd-all" onClick={() => { setColHover(false); goCollection(null); }}>
                    {lang === "bg" ? "Всички колекции" : "All Collections"}
                  </div>
                  {COLLECTIONS.filter(c => c.id !== "evening").map(c => (
                    <div key={c.id} className="nd-item" onClick={() => { setColHover(false); goCollection(c.id); }}>
                      <span className="nd-label">{c.label}</span>
                      <span className="nd-desc">{lang === "bg" ? c.desc_bg.split("—")[0] : c.desc_en.split("—")[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className={`nav-link`} onClick={() => goCollection("evening")}>{t.nav.accessories}</span>
            <span className={`nav-link ${route === "about" ? "active" : ""}`} onClick={() => setRoute("about")}>{t.nav.about}</span>
          </div>
          <div className={`burger ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(!drawerOpen)}>
            <span></span><span></span><span></span>
          </div>
          <div className="brand-mark" onClick={() => { setDrawerOpen(false); setRoute("home"); }}>
            АРЕТИ
            <span className="sub">— BRIDAL · SOFIA —</span>
          </div>
          <div className="nav-right">
            <span className={`nav-link ${route === "blog" ? "active" : ""}`} onClick={() => setRoute("blog")}>{t.nav.blog}</span>
            <span className={`nav-link ${route === "contact" ? "active" : ""}`} onClick={() => setRoute("contact")}>{t.nav.contact}</span>
            <button className={`nav-fav ${route === "wishlist" ? "active" : ""}`} onClick={() => setRoute("wishlist")} aria-label={t.nav.wishlist}>
              <svg viewBox="0 0 24 24" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" width="18" height="18">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {favorites.length > 0 && <span className="nav-fav-count">{favorites.length}</span>}
            </button>
            <span className={`nav-link nav-link--cta ${route === "booking" ? "active" : ""}`} onClick={() => setRoute("booking")}>{t.nav.bookings}</span>
            <div className="lang-toggle">
              <button className={lang === "bg" ? "active" : ""} onClick={() => setLang("bg")}><span>BG</span></button>
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}><span>EN</span></button>
            </div>
          </div>
        </div>
      </nav>
      <div className={`mobile-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="m-header">
          <span className="m-brand">АРЕТИ</span>
          <button className="m-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <nav className="m-nav">
          <div className={`m-link ${route === "home" ? "m-link--active" : ""}`} onClick={() => goTo("home")}>
            <span>{t.nav.home}</span>
            <span className="arr">→</span>
          </div>
          <div className={`m-link ${route === "collection" ? "m-link--active" : ""}`} onClick={() => { goTo("collection"); goCollection(null); }}>
            <span>{t.nav.collection}</span>
            <span className="arr">→</span>
          </div>
          {COLLECTIONS.filter(c => c.id !== "evening").map(c => (
            <div key={c.id} className="m-link m-link-sub" onClick={() => { goTo("collection"); goCollection(c.id); }}>
              <span>{c.label}</span>
            </div>
          ))}
          <div className="m-divider" />
          <div className={`m-link ${route === "about" ? "m-link--active" : ""}`} onClick={() => goTo("about")}>
            <span>{t.nav.about}</span>
            <span className="arr">→</span>
          </div>
          <div className={`m-link m-link-sub ${route === "demetrios" ? "m-link--active" : ""}`} onClick={() => goTo("demetrios")}>
            <span style={{ fontStyle: "italic" }}>{t.nav.demetrios}</span>
          </div>
          <div className={`m-link ${route === "blog" ? "m-link--active" : ""}`} onClick={() => goTo("blog")}>
            <span>{t.nav.blog}</span>
            <span className="arr">→</span>
          </div>
          <div className={`m-link ${route === "contact" ? "m-link--active" : ""}`} onClick={() => goTo("contact")}>
            <span>{t.nav.contact}</span>
            <span className="arr">→</span>
          </div>
          <div className={`m-link ${route === "wishlist" ? "m-link--active" : ""}`} onClick={() => goTo("wishlist")}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {t.nav.wishlist}
              {favorites.length > 0 && (
                <span className="m-fav-badge">{favorites.length}</span>
              )}
            </span>
            <span className="arr">→</span>
          </div>
        </nav>
        <div className="m-foot">
          <button className="m-cta" onClick={() => goTo("booking")}>{t.nav.bookings} →</button>
          <div className="m-foot-row">
            <span className="m-meta">АРЕТИ · BRIDAL · SOFIA · EST MMXIV</span>
            <div className="m-lang">
              <button className={lang === "bg" ? "active" : ""} onClick={() => setLang("bg")}>BG</button>
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ----- Footer -----
function Footer({ lang, setRoute }) {
  const t = i18n[lang].footer;
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
            <ul>{t.atelier_links.map((x, i) => <li key={i}><a onClick={() => setRoute(i === 0 ? "about" : i === 1 ? "demetrios" : i === 2 ? "blog" : "contact")}>{x}</a></li>)}</ul>
          </div>
          <div>
            <h4>{t.help}</h4>
            <ul>{t.help_links.map((x, i) => <li key={i}><a onClick={() => setRoute(i === 0 ? "booking" : i === 1 ? "contact" : "contact")}>{x}</a></li>)}</ul>
          </div>
        </div>
        <div className="bottom">
          <span>{t.copyright}</span>
          <span>{t.lang_marker}</span>
          <button
            onClick={() => setRoute("admin")}
            style={{ background:"none", border:"none", cursor:"default", color:"transparent", fontSize:"inherit", padding:"0 4px", userSelect:"none", opacity:0 }}
            aria-hidden="true"
            tabIndex={-1}
          >·</button>
        </div>
      </div>
    </footer>
  );
}

const SALON_ADDRESS = "бул. Витоша 87, София 1000";
const SALON_PHONE   = "+359878521660";
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SALON_ADDRESS)}`;
const NAV_URL  = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SALON_ADDRESS)}`;

// ----- FloatDial -----
function FloatDial({ setRoute, lang }) {
  const [open, setOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const closeAll = () => { setAddrOpen(false); setPhoneOpen(false); };

  const actions = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      label: lang === "bg" ? "Намери ни" : "Find us",
      onClick: () => { setPhoneOpen(false); setAddrOpen(v => !v); },
      active: addrOpen,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 2.96 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.98 5.98l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/>
        </svg>
      ),
      label: lang === "bg" ? "Обади се" : "Call us",
      onClick: () => { setAddrOpen(false); setPhoneOpen(v => !v); },
      active: phoneOpen,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      label: lang === "bg" ? "Пиши ни" : "Email us",
      onClick: () => { closeAll(); window.location.href = "mailto:info@areti.bg"; },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      label: lang === "bg" ? "Запази час" : "Book fitting",
      onClick: () => { setOpen(false); closeAll(); setRoute("booking"); },
    },
  ];

  return (
    <div className={`float-dial ${open ? "open" : ""}`}>
      {addrOpen && open && (
        <div className="fd-addr-card">
          <div className="fd-addr-label">{lang === "bg" ? "Нашият адрес" : "Our address"}</div>
          <div className="fd-addr-text">{SALON_ADDRESS}</div>
          <div className="fd-addr-actions">
            <a className="fd-addr-btn" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              {lang === "bg" ? "Виж на картата" : "View on map"}
            </a>
            <a className="fd-addr-btn fd-addr-btn--primary" href={NAV_URL} target="_blank" rel="noopener noreferrer">
              {lang === "bg" ? "Навигирай →" : "Navigate →"}
            </a>
          </div>
        </div>
      )}
      {phoneOpen && open && (
        <div className="fd-addr-card">
          <div className="fd-addr-label">{lang === "bg" ? "Свържи се с нас" : "Get in touch"}</div>
          <div className="fd-addr-text">{SALON_PHONE}</div>
          <div className="fd-phone-opts">
            <a className="fd-phone-opt" href={`tel:${SALON_PHONE}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 2.96 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.98 5.98l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/>
              </svg>
              <span>{lang === "bg" ? "Телефон" : "Phone"}</span>
            </a>
            <a className="fd-phone-opt" href={`viber://chat?number=${SALON_PHONE.replace('+','%2B')}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M11.4 0C5.5.3.8 4.8.5 10.7c-.1 2.4.4 4.7 1.6 6.7L.5 23l5.8-1.5c1.8.9 3.8 1.4 5.9 1.4h.1C18 22.9 23 17.9 23 11.5 23 5.2 17.8 0 11.4 0zm0 20.8c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.5.9.9-3.3-.3-.4C1.8 14.8 1.4 13 1.5 11c.3-5 4.3-8.7 9.4-8.7 5 0 9.1 4.1 9.1 9.2-.1 5-4.2 9.3-9.6 9.3zm5-6.9c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.2-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4 0-.2 0-.3-.1-.5l-.9-2.1c-.2-.5-.5-.5-.6-.5H7c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.8 2.6 1 2.6.7 3.1.6.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.3-.2-.5-.3z"/>
              </svg>
              <span>Viber</span>
            </a>
            <a className="fd-phone-opt" href={`https://wa.me/${SALON_PHONE.replace('+','')}`} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.91-2.2-.24-.57-.48-.49-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.45 0 1.44 1.05 2.84 1.2 3.04.15.2 2.07 3.15 5 4.42.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.76-.72 2-1.41.25-.7.25-1.3.18-1.41-.07-.12-.27-.19-.56-.34zm-5.4 7.37h-.02c-1.5 0-2.97-.4-4.27-1.16l-.3-.18-3.16.83.84-3.08-.2-.32C3.86 16.2 3 13.85 3 11.4 3.01 5.7 7.74 1 13.48 1c2.77 0 5.37 1.08 7.33 3.04 1.96 1.96 3.03 4.56 3.03 7.33-.01 5.7-4.74 10.38-10.47 10.38z"/>
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}
      {actions.map((a, i) => (
        <div
          key={i}
          className="fd-item"
          style={{ transitionDelay: open ? `${i * 55}ms` : `${(actions.length - 1 - i) * 40}ms` }}
        >
          <span className="fd-label">{a.label}</span>
          <button className={`fd-btn${a.active ? " fd-btn--active" : ""}`} onClick={a.onClick}>
            {a.icon}
          </button>
        </div>
      ))}
      <button className="fd-main" onClick={() => { setOpen(o => !o); closeAll(); }} aria-label="menu">
        <span className="fd-x">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="22" height="22">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
        <span className="fd-plus">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.57 21 3 13.43 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.25 1.02L6.6 10.8z"/>
          </svg>
        </span>
      </button>
    </div>
  );
}

export { Nav, Footer, Img, FloatDial };
