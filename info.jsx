// =====================================================
//  INFO pages — About, Contact, Blog
// =====================================================

function AboutPage({ lang, setRoute }) {
  const t = window.i18n[lang].about;
  return (
    <div className="page-enter">
      <div className="about-hero">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.crumb}</div>
          <h1>{t.title} <em>{t.title_em}</em></h1>
        </div>
        <p className="lede">{t.lede}</p>
      </div>
      <div style={{ padding: "0 var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <Img src={window.IMG.about} label="atelier" className="about-feature-img" />
      </div>
      <div className="about-stats">
        {t.stats.map((s, i) => (
          <div key={i} className="stat">
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="timeline">
        <div className="sec-head" style={{ marginBottom: 32 }}>
          <div className="left">— Хроника</div>
          <h2 style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>Дванадесет <em>години</em></h2>
          <div className="right">2014 → MMXXVI</div>
        </div>
        {t.timeline.map((row, i) => (
          <div key={i} className="timeline-row">
            <div className="yr">{row.yr}</div>
            <h3>{row.title}</h3>
            <p>{row.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPage({ lang, setRoute }) {
  const t = window.i18n[lang].contact;
  return (
    <div className="page-enter">
      <div className="contact">
        <div className="contact-head">
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 24 }}>— Намери ни</div>
            <h1>{t.title} <em>{t.title_em}</em></h1>
          </div>
          <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 22, lineHeight: 1.4, color: "var(--ink-soft)" }}>{t.lede}</p>
        </div>
        <div className="locations">
          {t.cities.map((c, i) => (
            <div key={i} className="location-card">
              <div className="t-eyebrow" style={{ marginBottom: 12 }}>{c.em}</div>
              <div className="city">{c.name}</div>
              <p className="addr">{c.addr.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>
              <div className="meta-line">{c.hours}</div>
              <div className="meta-line">{c.phone}</div>
              <div className="meta-line">{c.email}</div>
              <div className="actions">
                <button className="btn-link">{t.directions}</button>
                <button className="btn-link" onClick={() => setRoute("booking")}>{t.book}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlogPage({ lang, setRoute }) {
  const t = window.i18n[lang].blog;
  return (
    <div className="page-enter">
      <div className="blog">
        <div className="blog-head">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>— Истории, ритуали, занаят</div>
          <h1>{t.title} <em>{t.title_em}</em></h1>
        </div>
        <div className="blog-feature">
          <Img src={window.IMG.blog} label="featured story" className="img" />
          <div>
            <div className="meta">{t.feature_meta}</div>
            <h2>{t.feature_title} <em>{t.feature_title_em}</em></h2>
            <p>{t.feature_p}</p>
            <button className="btn">{t.read} →</button>
          </div>
        </div>
        <div className="blog-grid">
          {t.cards.map((card, i) => {
            const imgs = [window.IMG.bride2, window.IMG.bride3, window.IMG.bride5, window.IMG.veil, window.IMG.detail2, window.IMG.bride7];
            return (
              <article key={i} className="blog-card">
                <Img src={imgs[i % imgs.length]} label={card.title} className="img" />
                <div className="meta">{card.meta}</div>
                <h3>{card.title}</h3>
                <p>{card.p}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AboutPage, ContactPage, BlogPage });
