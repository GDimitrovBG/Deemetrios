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

function CollectionPage({ lang, setRoute }) {
  const t = window.i18n[lang];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("new");

  const filtered = useMemo(() => {
    let list = [...window.DRESSES, ...window.DRESSES.slice(0, 3)]; // 12 items
    const sf = filters.silhouette || [];
    if (sf.length) list = list.filter(d => sf.includes(d.silhouette));
    if (filters.priceLo != null) list = list.filter(d => d.price >= filters.priceLo);
    if (filters.priceHi != null) list = list.filter(d => d.price <= filters.priceHi);
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [filters, sortBy]);

  const activeCount = Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v != null).length;

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.collection.crumb}</div>
          <h1>{t.collection.title} <em>{t.collection.title_em}</em></h1>
        </div>
        <div className="meta-stack">
          <div className="crumb">N° XXVI</div>
          <div className="count">{t.collection.count}</div>
        </div>
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
      <div className="collection-grid">
        {filtered.map((d, i) => (
          <DressCard key={i} d={d} lang={lang} onClick={() => setRoute("product")} />
        ))}
      </div>
    </div>
  );
}

function ProductPage({ lang, setRoute }) {
  const t = window.i18n[lang];
  const [activeSize, setActiveSize] = useState(38);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const dress = window.DRESSES[0];
  const name = lang === "bg" ? dress.name_bg : dress.name_en;

  const galleryImgs = [window.IMG.bride1, window.IMG.detail1, window.IMG.detail2, window.IMG.bride2];
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
              <button className="btn btn-solid" onClick={() => setRoute("booking")}>{t.product.cta_book}</button>
              <button className="btn">{t.product.cta_inquire}</button>
            </div>
          </aside>
        </div>
        <section style={{ padding: "var(--s-9) var(--gutter)", borderTop: "1px solid var(--rule)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 48 }}>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1 }}>{t.product.similar}</h2>
            <span className="t-meta">— Romansa MMXXVI</span>
          </div>
          <div className="dress-grid">
            {window.DRESSES.slice(1, 4).map((d) => (
              <DressCard key={d.ref} d={d} lang={lang} onClick={() => { window.scrollTo(0, 0); }} />
            ))}
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
  const t = window.i18n[lang];
  const [cat, setCat] = useState(t.accessories.categories[0]);

  const items = useMemo(() => {
    if (cat === t.accessories.categories[0]) return window.ACCESSORIES;
    return window.ACCESSORIES.filter(a => (lang === "bg" ? a.cat : a.cat_en) === cat);
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

Object.assign(window, { CollectionPage, ProductPage, AccessoriesPage });
