import i18n from './i18n';
import { IMG } from './data';
import { Img } from './components';
import { BLOG_POSTS } from './blog_data';

// Merge static BLOG_POSTS with any admin edits stored in localStorage
function getActivePosts() {
  try {
    const stored = JSON.parse(localStorage.getItem('areti_articles') || 'null');
    if (!stored || !stored.length) return BLOG_POSTS;
    // Map stored admin articles back to the blog post shape
    return stored
      .filter(a => a.visible !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(a => ({
        id:      Number(a.id) || a.id,
        title:   a.title_bg || a.title,
        date:    a.date ? new Date(a.date).toLocaleDateString('bg-BG', { day:'numeric', month:'long', year:'numeric' }) : '',
        isoDate: a.date,
        category: a.category || 'Блог',
        image:   a.img || '',
        excerpt: a.excerpt_bg || a.excerpt || '',
        content: a.content || '',
      }));
  } catch {
    return BLOG_POSTS;
  }
}

// =====================================================
//  INFO pages — About, Contact, Blog
// =====================================================

function AboutPage({ lang, setRoute }) {
  const t = i18n[lang].about;
  const isBg = lang === "bg";
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
        <Img src={IMG.about} label="atelier" className="about-feature-img" />
      </div>
      <div className="about-stats">
        {t.stats.map((s, i) => (
          <div key={i} className="stat">
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Demetrios brand intro banner */}
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "var(--s-10) var(--gutter)", position: "relative", overflow: "hidden" }}>
        {/* subtle watermark */}
        <div aria-hidden="true" style={{
          position: "absolute", right: "-2%", top: "50%", transform: "translateY(-50%)",
          fontFamily: "var(--f-display)", fontStyle: "italic",
          fontSize: "clamp(160px, 22vw, 320px)", lineHeight: 1,
          color: "rgba(255,253,248,0.04)", pointerEvents: "none", userSelect: "none",
        }}>Demetrios</div>

        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", position: "relative" }}>
          {/* header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,253,248,0.12)", paddingBottom: 20, marginBottom: 48 }}>
            <div className="t-eyebrow" style={{ color: "rgba(255,253,248,0.4)", letterSpacing: "0.3em" }}>
              — {isBg ? "Официален представител" : "Official representative"}
            </div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 13, fontStyle: "italic", color: "rgba(255,253,248,0.3)" }}>
              {isBg ? "България · EST. 1992" : "Bulgaria · EST. 1992"}
            </div>
          </div>

          {/* two-column: title + text / feature items */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(40px, 6vw, 96px)", alignItems: "start" }}>
            <div>
              <h2 style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 1.05, color: "var(--bg)", marginBottom: 28 }}>
                {isBg ? "Ексклузивно за" : "Exclusively for"}<br /><em style={{ color: "var(--champagne-deep)" }}>{isBg ? "България" : "Bulgaria"}</em>
              </h2>
              <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 18, lineHeight: 1.7, color: "rgba(255,253,248,0.65)", marginBottom: 36 }}>
                {isBg
                  ? "Арети е официален и ексклузивен представител на световно известната марка Demetrios в България. Всички рокли са внесени директно от производителя с гарантирано качество."
                  : "Areti is the official and exclusive representative of the world-renowned Demetrios brand in Bulgaria. All gowns are imported directly from the manufacturer with guaranteed quality."}
              </p>
              <button className="btn" onClick={() => setRoute("demetrios")}
                style={{ borderColor: "rgba(255,253,248,0.4)", color: "var(--bg)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--bg)"; }}>
                {isBg ? "За Деметриос →" : "About Demetrios →"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {[
                { num: "3000+", label: isBg ? "Салона в света" : "Boutiques worldwide" },
                { num: "60+", label: isBg ? "Страни" : "Countries" },
                { num: isBg ? "Ръчна" : "Hand", label: isBg ? "Бродерия" : "Embroidery" },
                { num: isBg ? "Безплатни" : "Free", label: isBg ? "Корекции" : "Alterations" },
              ].map((item, i) => (
                <div key={i} style={{ background: "rgba(255,253,248,0.05)", padding: "28px 24px", borderTop: "1px solid rgba(255,253,248,0.1)" }}>
                  <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(22px, 2.5vw, 34px)", color: "var(--bg)", marginBottom: 8, lineHeight: 1 }}>{item.num}</div>
                  <div style={{ fontFamily: "var(--f-sans)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,253,248,0.4)" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="timeline">
        <div className="sec-head" style={{ marginBottom: 32 }}>
          <div className="left">— {isBg ? "Хроника" : "Timeline"}</div>
          <h2 style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>{isBg ? "Тридесет" : "Thirty"} <em>{isBg ? "години" : "years"}</em></h2>
          <div className="right">1992 → MMXXVI</div>
        </div>
        {t.timeline.map((row, i) => (
          <div key={i} className="timeline-row">
            <div className="yr">{row.yr}</div>
            <h3>{row.title}</h3>
            <p>{row.p}</p>
          </div>
        ))}
      </div>

      {/* Address / visit us */}
      <div style={{ padding: "var(--s-9) var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto var(--s-9)" }}>
        <div className="sec-head" style={{ marginBottom: 40 }}>
          <div className="left">—</div>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)" }}>{isBg ? "Намери" : "Find"} <em>{isBg ? "ни" : "us"}</em></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>{isBg ? "Адрес" : "Address"}</div>
            <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7 }}>
              {isBg ? "ул. Крум Попов 63" : "63 Krum Popov St."}<br />
              {isBg ? "Лозенец, София" : "Lozenets, Sofia"}<br />
              {isBg ? "България" : "Bulgaria"}
            </p>
          </div>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>{isBg ? "Контакт" : "Contact"}</div>
            <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7 }}>
              +359 878 521 660<br />
              info@areti.bg
            </p>
          </div>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>{isBg ? "Работно време" : "Hours"}</div>
            <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7 }}>
              {isBg ? "Вт – Сб · 11:00 – 19:00" : "Tue – Sat · 11:00 – 19:00"}<br />
              {isBg ? "По уговорка" : "By appointment"}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn" onClick={() => setRoute("booking")}>
              {isBg ? "Запази проба →" : "Book a fitting →"}
            </button>
            <button className="btn-outline" onClick={() => setRoute("contact")}>
              {isBg ? "Контакти" : "Contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemetriosPage({ lang, setRoute }) {
  const t = i18n[lang].demetrios;
  const isBg = lang === "bg";
  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="about-hero">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t.eyebrow}</div>
          <h1>{t.title} <em>{t.title_em}</em></h1>
        </div>
        <p className="lede">{t.lede}</p>
      </div>

      {/* Quote */}
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "var(--s-10) var(--gutter)", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(40px, 5vw, 72px)", fontFamily: "var(--f-display)", fontStyle: "italic", lineHeight: 1.2, marginBottom: 24 }}>
            „{t.quote}"
          </div>
          <div style={{ fontFamily: "var(--f-serif)", fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.6 }}>
            {t.quote_attr}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{ padding: "var(--s-9) var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-9)", alignItems: "start" }}>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 20 }}>{t.bio_title}</div>
            <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.7, marginBottom: 20, color: "var(--ink-soft)" }}>{t.bio_p1}</p>
            <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.7, color: "var(--ink-soft)" }}>{t.bio_p2}</p>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { num: "1980", label: isBg ? "Ilissa Bridals, Ню Йорк" : "Ilissa Bridals, New York" },
                { num: "1982", label: isBg ? "Demetrios Bridal основана" : "Demetrios Bridal founded" },
                { num: "60+", label: isBg ? "Страни с представителство" : "Countries represented" },
                { num: "3000+", label: isBg ? "Бутика в света" : "Boutiques worldwide" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--champagne)", padding: "24px 20px", borderRadius: 2 }}>
                  <div style={{ fontFamily: "var(--f-display)", fontSize: "clamp(28px, 3vw, 42px)", fontStyle: "italic", color: "var(--ink)", marginBottom: 8 }}>{s.num}</div>
                  <div style={{ fontFamily: "var(--f-sans)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Philosophy */}
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "var(--s-10) var(--gutter)", position: "relative", overflow: "hidden" }}>
        {/* decorative large background letter */}
        <div aria-hidden="true" style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--f-display)", fontStyle: "italic",
          fontSize: "clamp(200px, 28vw, 400px)",
          lineHeight: 1, color: "rgba(255,253,248,0.03)",
          pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap",
        }}>D</div>

        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", position: "relative" }}>
          {/* top row */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 40, borderBottom: "1px solid rgba(255,253,248,0.12)", paddingBottom: 24 }}>
            <div className="t-eyebrow" style={{ color: "rgba(255,253,248,0.45)", letterSpacing: "0.3em" }}>— {t.philosophy_title}</div>
            <div style={{ fontFamily: "var(--f-serif)", fontSize: 13, fontStyle: "italic", color: "rgba(255,253,248,0.3)" }}>Demetrios Bridal · EST. 1982</div>
          </div>

          {/* main content: big title + text */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(32px, 6vw, 80px)", alignItems: "end" }}>
            <h2 style={{
              fontFamily: "var(--f-display)", fontStyle: "italic",
              fontSize: "clamp(48px, 7vw, 96px)",
              lineHeight: 1.05, color: "var(--bg)",
              margin: 0,
            }}>
              {isBg ? "Изкуство,\nне просто\nрокля." : "Art,\nnot just\na gown."}
            </h2>
            <div>
              <p style={{
                fontFamily: "var(--f-serif)", fontStyle: "italic",
                fontSize: "clamp(17px, 1.6vw, 21px)",
                lineHeight: 1.75,
                color: "rgba(255,253,248,0.72)",
                marginBottom: 32,
              }}>
                {t.philosophy_p}
              </p>
              <div style={{ display: "flex", gap: 40 }}>
                {[
                  { num: isBg ? "Ръчна" : "Hand-", em: isBg ? "бродерия" : "embroidered" },
                  { num: isBg ? "Swarovski" : "Swarovski", em: isBg ? "кристали" : "crystals" },
                  { num: isBg ? "Строг" : "Strict", em: isBg ? "контрол" : "QC" },
                ].map((item, i) => (
                  <div key={i} style={{ borderTop: "1px solid rgba(255,253,248,0.2)", paddingTop: 16 }}>
                    <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 22, color: "var(--champagne-deep)", marginBottom: 4 }}>{item.num}</div>
                    <div style={{ fontFamily: "var(--f-sans)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,253,248,0.4)" }}>{item.em}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collections */}
      <div style={{ padding: "var(--s-9) var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div className="sec-head" style={{ marginBottom: 48 }}>
          <div className="left">—</div>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 60px)" }}>{t.collections_title}</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
          {t.collections.map((col, i) => (
            <div
              key={i}
              style={{ background: "var(--ink)", color: "var(--bg)", padding: "40px 32px", cursor: "pointer", transition: "opacity .2s" }}
              onClick={() => setRoute("collection")}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(24px, 2.5vw, 36px)", marginBottom: 16 }}>{col.name}</div>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: 15, lineHeight: 1.6, opacity: 0.75 }}>{col.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA band */}
      <div style={{ padding: "var(--s-9) var(--gutter)", textAlign: "center", borderTop: "1px solid var(--champagne)" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="t-eyebrow" style={{ marginBottom: 16 }}>— {isBg ? "В Арети, София" : "At Areti, Sofia"}</div>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 48px)", marginBottom: 32 }}>
            {isBg ? "Намери своята" : "Find your"} <em>{isBg ? "Demetrios рокля" : "Demetrios gown"}</em>
          </h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn" onClick={() => setRoute("collection")}>{t.cta} →</button>
            <button className="btn-outline" onClick={() => setRoute("about")}>{t.cta_about}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPage({ lang, setRoute }) {
  const t = i18n[lang].contact;
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

function BlogPage({ lang, setRoute, goBlogPost }) {
  const isBg = lang === "bg";
  const posts = getActivePosts();
  const [featured, ...rest] = posts;

  return (
    <div className="page-enter">
      <div className="blog">
        <div className="blog-head">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>— {isBg ? "Истории, ритуали, занаят" : "Stories, rituals, craft"}</div>
          <h1>{isBg ? "Нашият" : "Our"} <em>{isBg ? "дневник" : "journal"}</em></h1>
        </div>

        {/* Featured post */}
        {featured && (
          <div className="blog-feature" style={{ cursor: "pointer" }} onClick={() => goBlogPost(featured.id)}>
            {featured.image
              ? <img src={featured.image} alt={featured.title} className="img" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div className="img" style={{ background: "var(--champagne)" }} />
            }
            <div>
              <div className="meta">{featured.category} · {featured.date}</div>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <button className="btn" onClick={e => { e.stopPropagation(); goBlogPost(featured.id); }}>
                {isBg ? "Прочети →" : "Read →"}
              </button>
            </div>
          </div>
        )}

        {/* Grid of remaining posts */}
        <div className="blog-grid">
          {rest.map((post) => (
            <article
              key={post.id}
              className="blog-card"
              style={{ cursor: "pointer" }}
              onClick={() => goBlogPost(post.id)}
            >
              {post.image
                ? <img src={post.image} alt={post.title} className="img" loading="lazy" decoding="async" />
                : <div className="img" style={{ background: "var(--champagne)" }} />
              }
              <div className="meta">{post.category} · {post.date}</div>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlogPostPage({ lang, setRoute, postId, goBlogPost }) {
  const isBg = lang === "bg";
  const posts = getActivePosts();
  const post = posts.find(p => p.id === postId || String(p.id) === String(postId)) || posts[0];
  const others = posts.filter(p => p.id !== post.id).slice(0, 3);

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="blog-post-hero">
        {post.image && (
          <img src={post.image} alt={post.title} className="blog-post-hero-img" loading="eager" decoding="sync" />
        )}
        <div className="blog-post-hero-overlay" />
        <div className="blog-post-hero-content">
          <div className="t-eyebrow" style={{ color: "rgba(255,253,248,0.55)", marginBottom: 16 }}>
            {post.category} · {post.date}
          </div>
          <h1 style={{ color: "var(--bg)", fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(32px, 5vw, 72px)", lineHeight: 1.1, margin: 0 }}>
            {post.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="blog-post-body">
        <button
          className="btn-link"
          style={{ marginBottom: 40, display: "inline-flex", alignItems: "center", gap: 8 }}
          onClick={() => setRoute("blog")}
        >
          ← {isBg ? "Обратно към дневника" : "Back to journal"}
        </button>

        <div
          className="blog-post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div style={{ marginTop: 64, paddingTop: 40, borderTop: "1px solid var(--champagne)" }}>
          <button className="btn" onClick={() => setRoute("booking")}>
            {isBg ? "Запази проба →" : "Book a fitting →"}
          </button>
        </div>
      </div>

      {/* Related posts */}
      {others.length > 0 && (
        <div style={{ padding: "var(--s-9) var(--gutter)", maxWidth: "var(--maxw)", margin: "0 auto" }}>
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <div className="left">—</div>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 44px)" }}>
              {isBg ? "Още" : "More"} <em>{isBg ? "статии" : "articles"}</em>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {others.map(op => (
              <article
                key={op.id}
                style={{ cursor: "pointer" }}
                onClick={() => goBlogPost(op.id)}
              >
                {op.image
                  ? <img src={op.image} alt={op.title} loading="lazy" decoding="async"
                      style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block", marginBottom: 16 }} />
                  : <div style={{ width: "100%", aspectRatio: "3/2", background: "var(--champagne)", marginBottom: 16 }} />
                }
                <div className="meta" style={{ marginBottom: 8 }}>{op.category} · {op.date}</div>
                <h3 style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: "clamp(18px, 2vw, 24px)", lineHeight: 1.2, marginBottom: 8 }}>{op.title}</h3>
                <p style={{ fontFamily: "var(--f-serif)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{op.excerpt.slice(0, 120)}…</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { AboutPage, ContactPage, BlogPage, BlogPostPage, DemetriosPage };
