import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import i18n from './i18n';
import { IMG, DRESSES, ACCESSORIES, COLLECTIONS } from './data';
import { Img } from './components';
import { DressCard } from './home';

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
        <div>
          <h5>{tg.price}</h5>
          <PriceRange filters={filters} setFilters={setFilters} />
        </div>
      </div>
    </div>
  );
}

function PriceRange({ filters, setFilters }) {
  const min = 1500, max = 8000;
  const lo = filters.priceLo ?? 2500;
  const hi = filters.priceHi ?? 6500;
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const pct = (v) => ((v - min) / (max - min)) * 100;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
      const v = Math.round(min + (Math.max(0, Math.min(1, x / rect.width))) * (max - min));
      if (drag === "lo") setFilters({ ...filters, priceLo: Math.min(v, hi - 100) });
      else setFilters({ ...filters, priceHi: Math.max(v, lo + 100) });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, filters, hi, lo]);

  return (
    <div>
      <div className="range-track" ref={trackRef}>
        <div className="range-fill" style={{ left: pct(lo) + "%", width: (pct(hi) - pct(lo)) + "%" }}></div>
        <div className="range-knob" style={{ left: pct(lo) + "%" }} onMouseDown={() => setDrag("lo")}></div>
        <div className="range-knob" style={{ left: pct(hi) + "%" }} onMouseDown={() => setDrag("hi")}></div>
      </div>
      <div className="range-vals">
        <span>{lo.toLocaleString("bg-BG")} лв.</span>
        <span>{hi.toLocaleString("bg-BG")} лв.</span>
      </div>
    </div>
  );
}

function CollectionPage({ lang, setRoute, initCollection = null, favorites = [], toggleFavorite }) {
  const t = i18n[lang];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("new");
  const [activeCol, setActiveCol] = useState(initCollection);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [gridCols, setGridCols] = useState(isMobile ? 2 : 2);

  useEffect(() => { setActiveCol(initCollection); }, [initCollection]);

  const filtered = useMemo(() => {
    let list = [...DRESSES];
    if (activeCol) list = list.filter(d => d.collection === activeCol);
    const sf = filters.silhouette || [];
    if (sf.length) list = list.filter(d => sf.includes(d.silhouette));
    if (filters.priceLo != null) list = list.filter(d => d.price >= filters.priceLo);
    if (filters.priceHi != null) list = list.filter(d => d.price <= filters.priceHi);
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [filters, sortBy, activeCol]);

  const activeCount = Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v != null).length;
  const activeColData = COLLECTIONS.find(c => c.id === activeCol);

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.collection.crumb}</div>
          <h1>
            {activeColData ? activeColData.label : <>{t.collection.title} <em>{t.collection.title_em}</em></>}
          </h1>
          {activeColData && (
            <p style={{ fontFamily: 'var(--f-serif)', fontSize: 16, fontStyle: 'italic', opacity: 0.7, marginTop: 12, maxWidth: 480 }}>
              {lang === 'bg' ? activeColData.desc_bg : activeColData.desc_en}
            </p>
          )}
        </div>
        <div className="meta-stack">
          <div className="crumb">N° XXVI</div>
          <div className="count">{filtered.length} {lang === 'bg' ? 'модела' : 'styles'}</div>
        </div>
      </div>

      <div className="collection-tabs">
        <button className={`col-tab ${!activeCol ? 'active' : ''}`} onClick={() => setActiveCol(null)}>
          {lang === 'bg' ? 'Всички' : 'All'}
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
          <span className="results">{t.collection.results(filtered.length)}</span>
          <span className="sort" onClick={() => setSortBy(sortBy === "new" ? "price-asc" : sortBy === "price-asc" ? "price-desc" : "new")}>
            {t.collection.sort}: {sortBy === "new" ? t.collection.sort_new : sortBy === "price-asc" ? "↑ Price" : "↓ Price"}
          </span>
        </div>
      </div>
      {filtersOpen && <FilterPanel t={t} lang={lang} filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />}

      <div className="mobile-grid-bar">
        <span className="mobile-grid-count">{filtered.length} {lang === "bg" ? "модела" : "styles"}</span>
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

      <div className={`collection-grid cols-${gridCols}`}>
        {filtered.map((d, i) => (
          <DressCard key={i} d={d} lang={lang} onClick={() => setRoute("product")} favorites={favorites} toggleFavorite={toggleFavorite} />
        ))}
      </div>

      {/* Mobile filter FAB + bottom sheet via portal (avoids page-enter transform) */}
      {createPortal(
        <>
        <button className="mobile-filter-fab" onClick={() => setMobileSheetOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          <span>{lang === "bg" ? "Филтри" : "Filters"}</span>
          {activeCount > 0 && <span className="mfab-badge">{activeCount}</span>}
        </button>
        {mobileSheetOpen && (
        <div className="msheet-overlay" onClick={() => setMobileSheetOpen(false)}>
          <div className="msheet" onClick={e => e.stopPropagation()}>
            <div className="msheet-handle" />
            <div className="msheet-head">
              <span>{lang === "bg" ? "Филтри и сортиране" : "Filter & Sort"}</span>
              <button className="msheet-close" onClick={() => setMobileSheetOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="msheet-body">
              <div className="msheet-section">
                <div className="msheet-label">{lang === "bg" ? "Колекция" : "Collection"}</div>
                <div className="msheet-pills">
                  <span className={`filter-pill ${!activeCol ? "on" : ""}`} onClick={() => setActiveCol(null)}>
                    {lang === "bg" ? "Всички" : "All"}
                  </span>
                  {COLLECTIONS.map(c => (
                    <span key={c.id} className={`filter-pill ${activeCol === c.id ? "on" : ""}`} onClick={() => setActiveCol(c.id)}>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="msheet-section">
                <div className="msheet-label">{lang === "bg" ? "Силует" : "Silhouette"}</div>
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
                <div className="msheet-label">{lang === "bg" ? "Подреди" : "Sort by"}</div>
                <div className="msheet-pills">
                  {[["new", lang === "bg" ? "Най-нови" : "Newest"], ["price-asc", lang === "bg" ? "↑ Цена" : "↑ Price"], ["price-desc", lang === "bg" ? "↓ Цена" : "↓ Price"]].map(([val, label]) => (
                    <span key={val} className={`filter-pill ${sortBy === val ? "on" : ""}`} onClick={() => setSortBy(val)}>{label}</span>
                  ))}
                </div>
              </div>

              <div className="msheet-section">
                <div className="msheet-label">{lang === "bg" ? "Цена" : "Price"}</div>
                <PriceRange filters={filters} setFilters={setFilters} />
              </div>
            </div>

            <div className="msheet-foot">
              {activeCount > 0 && (
                <button className="msheet-reset" onClick={() => { setFilters({}); setActiveCol(null); }}>
                  {lang === "bg" ? "Изчисти всички" : "Clear all"}
                </button>
              )}
              <button className="btn btn-solid msheet-apply" onClick={() => setMobileSheetOpen(false)}>
                {lang === "bg" ? `Виж ${filtered.length} модела` : `Show ${filtered.length} styles`}
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

function ProductPage({ lang, setRoute, favorites = [], toggleFavorite, goBooking }) {
  const t = i18n[lang];
  const [activeSize, setActiveSize] = useState(38);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const dress = DRESSES[0];
  const isFav = favorites.includes(dress.ref);
  const name = lang === "bg" ? dress.name_bg : dress.name_en;

  const galleryImgs = [IMG.bride1, IMG.detail1, IMG.detail2, IMG.bride2];
  const sizes = [34, 36, 38, 40, 42, 44, 46, 48];
  const outOfStock = [46, 48];

  return (
    <div className="page-enter">
      <div className="product">
        <div className="product-crumb">
          <a onClick={() => setRoute("home")} style={{ cursor: "pointer" }}>Areti</a>
          <a onClick={() => setRoute("collection")} style={{ cursor: "pointer" }}>{t.product.crumb_back}</a>
          <span style={{ color: "var(--ink)" }}>{name}</span>
        </div>
        <div className="product-main">
          <div className="product-gallery">
            <Img src={galleryImgs[0]} label={`${name} · main`} className="main-img" style={{ cursor: "zoom-in" }} />
            <div onClick={() => setLightboxIdx(0)} style={{ cursor: "zoom-in", gridColumn: "span 2", aspectRatio: "3/4", backgroundImage: `url(${galleryImgs[0]})`, backgroundSize: "cover", backgroundPosition: "center", display: "none" }}></div>
            {[1, 2, 3].map((i) => (
              <Img key={i} src={galleryImgs[i]} label={`detail ${i}`} className="thumb" style={{ cursor: "zoom-in" }} />
            ))}
            <div className="thumb" style={{ background: "var(--bg-deep)", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => setLightboxIdx(0)}>
              <span style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ink-soft)" }}>+ 4 more</span>
            </div>
          </div>
          <aside className="product-info">
            <div className="designer">{t.product.designer}</div>
            <h1>{name}</h1>
            <div className="ref">{t.product.ref}: {dress.ref}</div>
            <div className="price">{t.product.price_from} {dress.price.toLocaleString("bg-BG")} лв.</div>
            <div className="price-note">{t.product.price_note}</div>
            <p className="desc">{t.product.desc}</p>
            <dl>
              <div className="spec-row"><dt>{t.product.specs.fabric}</dt><dd>{t.product.specs.fabric_v}</dd></div>
              <div className="spec-row"><dt>{t.product.specs.silhouette}</dt><dd>{t.product.specs.silhouette_v}</dd></div>
              <div className="spec-row"><dt>{t.product.specs.neckline}</dt><dd>{t.product.specs.neckline_v}</dd></div>
              <div className="spec-row"><dt>{t.product.specs.train}</dt><dd>{t.product.specs.train_v}</dd></div>
              <div className="spec-row"><dt>{t.product.specs.details}</dt><dd>{t.product.specs.details_v}</dd></div>
            </dl>
            <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--ink-mute)" }}>{t.product.size}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--ink-soft)", borderBottom: "1px solid var(--ink-soft)", cursor: "pointer" }}>{t.product.size_guide}</span>
            </div>
            <div className="size-grid">
              {sizes.map(s => (
                <button
                  key={s}
                  className={`size-pick ${activeSize === s ? "on" : ""} ${outOfStock.includes(s) ? "out" : ""}`}
                  onClick={() => !outOfStock.includes(s) && setActiveSize(s)}
                >{s}</button>
              ))}
            </div>
            <p style={{ fontSize: 11, fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--ink-mute)", marginTop: 8 }}>{t.product.size_warn}</p>
            <div className="cta-stack">
              <button className="btn btn-solid" onClick={() => (goBooking ? goBooking(dress) : setRoute("booking"))}>{t.product.cta_book}</button>
              <button className="btn">{t.product.cta_inquire}</button>
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
            <span className="t-meta">— Romansa MMXXVI</span>
          </div>
          <div className="dress-grid dress-grid--4">
            {DRESSES.slice(1, 5).map((d) => (
              <DressCard key={d.ref} d={d} lang={lang} onClick={() => { window.scrollTo(0, 0); }} favorites={favorites} toggleFavorite={toggleFavorite} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="btn" onClick={() => setRoute("collection")}>
              {lang === "bg" ? "Виж цялата колекция" : "View full collection"} <span style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>→</span>
            </button>
          </div>
        </section>
      </div>
      {lightboxIdx !== null && (
        <Lightbox imgs={galleryImgs} idx={lightboxIdx} setIdx={setLightboxIdx} label={name} />
      )}
    </div>
  );
}

function Lightbox({ imgs, idx, setIdx, label }) {
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
      <Img src={imgs[idx]} label={label} style={{ aspectRatio: "3/4", height: "85vh", width: "auto" }} />
      <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }}>›</button>
      <div className="lightbox-counter">{(idx + 1).toString().padStart(2, "0")} / {imgs.length.toString().padStart(2, "0")}</div>
    </div>
  );
}

function AccessoriesPage({ lang, setRoute }) {
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
          <div className="crumb">N° XXVI</div>
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
            <Img src={a.img} label={lang === "bg" ? a.name_bg : a.name_en} className="img" />
            <div className="info">
              <div>
                <h3>{lang === "bg" ? a.name_bg : a.name_en}</h3>
                <div className="meta" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: 4 }}>{lang === "bg" ? a.cat : a.cat_en}</div>
              </div>
              <span className="price">{a.price.toLocaleString("bg-BG")} лв.</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WishlistPage({ lang, setRoute, favorites = [], toggleFavorite, goBooking }) {
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
              const name = lang === "bg" ? d.name_bg : d.name_en;
              const sil = lang === "bg" ? d.silhouette : d.silhouette_en;
              return (
                <div key={d.ref} className="wishlist-card">
                  <Img src={d.img} label={name} className="wishlist-img" />
                  <div className="wishlist-card-info">
                    <div>
                      <div className="wishlist-card-name">{name}</div>
                      <div className="wishlist-card-meta">{sil} · {d.fabric}</div>
                      <div className="wishlist-card-price">от {d.price.toLocaleString("bg-BG")} лв.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-solid" style={{ flex: 1, padding: "10px 0", fontSize: 10 }} onClick={() => goBooking ? goBooking(d) : setRoute("booking")}>
                        {lang === "bg" ? "Запази проба" : "Book fitting"}
                      </button>
                      <button
                        className="wishlist-remove"
                        onClick={() => toggleFavorite && toggleFavorite(d.ref)}
                        aria-label="Премахни"
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
                <span key={d.ref} className="wishlist-ref-pill">Реф. {d.ref}</span>
              ))}
            </div>

            <div className="fields-row" style={{ marginTop: 28 }}>
              <div className="field">
                <label>{lang === "bg" ? "Ime" : "Name"}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Мария Иванова" />
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
