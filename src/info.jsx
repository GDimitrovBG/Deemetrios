import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import i18n from './i18n';
import { IMG, DRESSES } from './data';
import { Img } from './components';
import { BLOG_POSTS } from './blog_data';
import { useSeo, orgSchema, articleSchema, breadcrumbSchema, blogPostPath } from './seo';
import { faqSchema } from './seo-helpers';
import { cdnImage } from './cdn';

function sanitizeHTML(html) {
  if (!html) return '';
  // The blog post page already renders the post title as the page <h1>. Article
  // bodies (from blog_data / admin) often open with their own <h1>, which gives
  // the page two H1s — an SEO anti-pattern. Demote any in-content <h1> to <h2>.
  html = html.replace(/<(\/?)h1(\s[^>]*)?>/gi, '<$1h2$2>');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','b','strong','i','em','u','a','ul','ol','li','h1','h2','h3','h4','h5','h6','blockquote','img','span','div','figure','figcaption','table','thead','tbody','tr','th','td'],
    // 'data-route' has to be listed explicitly: ALLOW_DATA_ATTR:false strips
    // every other data-* attribute, and it used to strip this one too — which
    // silently killed all 63 internal links in the articles (the click handler
    // below called preventDefault and then found no route to go to).
    ALLOWED_ATTR: ['href','src','alt','title','class','style','target','rel','width','height','loading','decoding','data-route'],
    ALLOW_DATA_ATTR: false,
  });
}

// Our own hostname, so absolute links written into article bodies
// (https://demetriosbride-bg.com/...) are still treated as internal.
const SITE_HOST = 'demetriosbride-bg.com';

/**
 * Handle a click inside a rendered article body.
 *
 * Drives navigation off the link's own href rather than a data-route
 * attribute. The href is the thing that is actually in the HTML, is what a
 * crawler follows, and covers every destination — products, collections,
 * silhouettes, other posts — where data-route only ever named a top-level
 * route. data-route is kept as a fallback for links that carry no usable href.
 *
 * Anything we don't recognise as our own is left alone, so external links keep
 * working normally instead of being swallowed by preventDefault.
 */
function followInternalLink(e, setRoute) {
  const link = e.target?.closest?.('a.blog-internal-link, a[data-route]');
  if (!link) return;
  const raw = link.getAttribute('href') || '';
  let target = '';
  if (raw && !raw.startsWith('#')) {
    let url;
    try { url = new URL(raw, window.location.origin); } catch { return; }
    const host = url.hostname.replace(/^www\./, '');
    const isOurs = url.origin === window.location.origin || host === SITE_HOST;
    if (!isOurs) return;                    // external link — let the browser go
    target = url.pathname + url.search;
  }
  e.preventDefault();
  if (!target) {
    const route = link.dataset.route;       // href-less link, legacy form
    if (route) setRoute(route);
    return;
  }
  if (target === window.location.pathname + window.location.search) return;
  // Hand the URL to the router the same way the browser's back button does:
  // App's popstate listener resolves redirects (old WordPress paths included)
  // and syncs every piece of route state, so this works for products,
  // collections and posts without threading a navigation prop into the article.
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Merge static BLOG_POSTS with any admin edits stored in localStorage
function getActivePosts(lang) {
  try {
    const stored = JSON.parse(localStorage.getItem('areti_articles') || 'null');
    if (!stored || !stored.length) return [...BLOG_POSTS].sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    // Build a lookup from the original static posts for fallback data
    const staticById = {};
    BLOG_POSTS.forEach(p => { staticById[String(p.id)] = p; });
    // Map stored admin articles back to the blog post shape, merging with static data
    return stored
      .filter(a => a.visible !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(a => {
        const orig = staticById[String(a.id)] || {};
        return {
          id:      Number(a.id) || a.id,
          title:   a.title_bg || a.title || orig.title || '',
          date:    a.date ? new Date(a.date).toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-US', { day:'numeric', month:'long', year:'numeric' }) : (orig.date || ''),
          isoDate: a.date || orig.isoDate || '',
          category: a.category || orig.category || 'Блог',
          image:   a.img || orig.image || '',
          excerpt: a.excerpt_bg || a.excerpt || orig.excerpt || '',
          // Admin-authored body stays inline; static posts load it lazily from
          // blog_content.js in BlogPostPage (keeps 106KB off every route).
          content: a.content || '',
          relatedRefs: (a.relatedRefs && a.relatedRefs.length) ? a.relatedRefs : (orig.relatedRefs || []),
          seo_title: a.seo_title || '',
          seo_description: a.seo_description || '',
          // Static-only fields the admin editor doesn't manage — carry them
          // through so slug URLs and the English versions survive admin edits.
          slug: orig.slug || '',
          faq: orig.faq || [],
          title_en: orig.title_en, seo_title_en: orig.seo_title_en,
          seo_description_en: orig.seo_description_en, excerpt_en: orig.excerpt_en,
          category_en: orig.category_en, date_en: orig.date_en, faq_en: orig.faq_en,
        };
      });
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
  useSeo({
    title: isBg ? "За Арети — сватбен салон в София от 1992 г. ★ 4.8 (266 отзива)" : "About Areti — Bridal Salon in Sofia since 1992 ★ 4.8 (266 reviews)",
    description: isBg
      ? "Арети е луксозен булчински салон в София, основан през 1992 г. — официален представител на Demetrios в България. Над 30 години обличаме булки."
      : "Areti is a luxury bridal salon in Sofia, founded in 1992 — the official Demetrios representative in Bulgaria. Dressing brides for over 30 years.",
    image: IMG.about, url: "/about", lang,
    keywords: "Арети, сватбен салон София, булчински салон Лозенец, история Demetrios България",
    jsonLd: orgSchema(),
    jsonLdId: "about",
  });
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
        <Img src="/images/about-hero.webp" label="atelier" className="about-feature-img" />
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
          <div className="right">1992 → 2026</div>
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
              {isBg ? "Пн – Пт · 10:00 – 19:00" : "Mon – Fri · 10:00 – 19:00"}<br />
              {isBg ? "Сб · 10:30 – 18:00" : "Sat · 10:30 – 18:00"}<br />
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
  useSeo({
    title: isBg ? "Кой е Demetrios — историята на марката" : "Demetrios James Elias — the story of the brand",
    description: isBg
      ? "Деметриос Джеймс Елиас — гръцки дизайнер, основал Demetrios Bridal през 1982 г. Колекциите му в Арети — официален представител на Demetrios в България."
      : "Demetrios James Elias — Greek-American designer who founded Demetrios Bridal in 1982. His collections at Areti, official Demetrios representative in Bulgaria.",
    url: "/demetrios", lang,
    keywords: "Demetrios James Elias, Деметриос дизайнер, Demetrios Bridal, Demetrios колекции, Cosmobella, Platinum",
    jsonLd: { "@graph": [
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Demetrios James Elias",
        "jobTitle": "Fashion Designer",
        "birthPlace": "Greece",
        "nationality": "Greek-American",
        "foundingDate": "1982",
        "brand": { "@type": "Brand", "name": "Demetrios" },
        "description": isBg
          ? "Гръцко-американски дизайнер, основател на Demetrios Bridal — световен лидер в булчинската мода."
          : "Greek-American designer, founder of Demetrios Bridal — a global leader in bridal fashion.",
      },
      breadcrumbSchema([
        { name: isBg ? "Начало" : "Home", url: "/" },
        { name: "Demetrios", url: "/demetrios" },
      ]),
    ]},
  });
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
  const isBg = lang === "bg";
  useSeo({
    title: isBg ? "Контакти — Арети, ул. Крум Попов 63, Лозенец, София" : "Contact — Areti, 63 Krum Popov St, Lozenets, Sofia",
    description: isBg
      ? "Контакти на булчински салон Арети — ул. Крум Попов 63, Лозенец, София. Тел. +359 878 521 660. Работно време пн–пт 10–19 ч., сб 10:30–18 ч."
      : "Contact Areti bridal salon — 63 Krum Popov St, Lozenets, Sofia. Tel. +359 878 521 660. Hours Mon–Fri 10–19, Sat 10:30–18.",
    url: "/contact", lang,
    keywords: "Арети контакти, сватбен салон Лозенец, телефон булчински салон София, адрес Арети",
    jsonLd: orgSchema(),
    jsonLdId: "contact",
  });
  return (
    <div className="page-enter">
      <div className="contact">
        <div className="contact-head">
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 24 }}>{lang === "en" ? "— Find us" : "— Намери ни"}</div>
            <h1>{t.title} <em>{t.title_em}</em></h1>
          </div>
          <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 22, lineHeight: 1.4, color: "var(--ink-soft)" }}>{t.lede}</p>
        </div>
        <div className="locations">
          {t.cities.map((c, i) => (
            <div key={i} className="location-card">
              {c.em ? <div className="t-eyebrow" style={{ marginBottom: 12 }}>{c.em}</div> : null}
              <div className="city">{c.name}</div>
              <p className="addr">{c.addr.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>
              <div className="meta-line">{c.hours.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</div>
              <div className="meta-line">{c.phone}</div>
              <div className="meta-line">{c.email}</div>
              <div className="actions">
                <a className="btn-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.addr.replace(/\n/g, ", "))}`} target="_blank" rel="noopener noreferrer">{t.directions}</a>
                <button className="btn-link" onClick={() => setRoute("booking")}>{t.book}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// English view of a post: swaps in the *_en fields when a translation exists.
// Posts without title_en simply have no English version (router redirects
// /en/blog/<slug> to the Bulgarian original for those).
function localizePost(post, lang) {
  if (lang !== 'en' || !post?.title_en) return post;
  return {
    ...post,
    title: post.title_en,
    seo_title: post.seo_title_en || post.title_en,
    seo_description: post.seo_description_en || post.excerpt_en || post.seo_description,
    excerpt: post.excerpt_en || post.excerpt,
    category: post.category_en || post.category,
    date: post.date_en || post.date,
    faq: post.faq_en || [],
  };
}

function BlogPage({ lang, setRoute, goBlogPost }) {
  const isBg = lang === "bg";
  // English blog lists only translated posts — publishing untranslated pages
  // under /en would be worse than not having them.
  const posts = getActivePosts(lang)
    .filter(p => isBg || p.title_en)
    .map(p => localizePost(p, lang));
  const [featured, ...rest] = posts;
  useSeo({
    title: isBg ? "Блог — статии за булчински рокли и сватбен стил" : "Blog — Wedding Dress & Style Articles | Areti Sofia",
    description: isBg
      ? "Блогът на Арети — съвети за избор на булчинска рокля, силуети, материи, тенденции и истории зад марката Demetrios. Полезни статии за всяка булка."
      : "The Areti blog — advice on choosing a wedding dress, silhouettes, fabrics, trends and stories behind the Demetrios brand. Useful articles for every bride.",
    image: featured?.image, url: "/blog", lang,
    keywords: "блог булчински рокли, съвети за булки, сватбен стил, тенденции 2026, Demetrios истории",
    jsonLd: breadcrumbSchema([
      { name: isBg ? "Начало" : "Home", url: "/" },
      { name: isBg ? "Блог" : "Blog", url: "/blog" },
    ]),
  });

  return (
    <div className="page-enter">
      <div className="blog">
        <div className="blog-head">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>— {isBg ? "Истории, ритуали, занаят" : "Stories, rituals, craft"}</div>
          <h1>{isBg ? "Нашият" : "Our"} <em>{isBg ? "блог" : "blog"}</em></h1>
        </div>

        {/* Featured post */}
        {featured && (
          <div className="blog-feature" style={{ cursor: "pointer" }} onClick={() => goBlogPost(featured.id)}>
            <div className="img-wrap">
              {featured.image
                ? <img src={cdnImage(featured.image, 1200)} alt={featured.title} className="img" loading="lazy" decoding="async" />
                : <div className="img" style={{ background: "var(--champagne)" }} />
              }
            </div>
            <div>
              <div className="meta">{featured.category} · {featured.date}</div>
              <h2><a href={`${isBg ? "" : "/en"}${featured.slug ? `/blog/${featured.slug}` : `/blog/${featured.id}`}`} onClick={(e) => e.preventDefault()}>{featured.title}</a></h2>
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
              <div className="img-wrap">
                {post.image
                  ? <img src={cdnImage(post.image, 600)} alt={post.title} className="img" loading="lazy" decoding="async" />
                  : <div className="img" style={{ background: "var(--champagne)" }} />
                }
              </div>
              <div className="meta">{post.category} · {post.date}</div>
              <h3><a href={`${isBg ? "" : "/en"}${post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`}`} onClick={(e) => e.preventDefault()}>{post.title}</a></h3>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlogPostPage({ lang, setRoute, postId, goBlogPost, goProduct, goBooking }) {
  const isBg = lang === "bg";
  const allPosts = getActivePosts(lang);
  const rawPost = allPosts.find(p => p.id === postId || String(p.id) === String(postId)) || allPosts[0];
  const post = localizePost(rawPost, lang);
  const others = allPosts
    .filter(p => p.id !== post.id && (isBg || p.title_en))
    .map(p => localizePost(p, lang))
    .slice(0, 3);

  // Article body is split into blog_content.js (106KB) and loaded on demand so
  // it never ships on non-blog routes. Admin-authored posts carry their own
  // inline `content`; static posts resolve it from BLOG_CONTENT by id.
  // During prerender the dynamic import resolves before Puppeteer snapshots
  // (networkidle0 + settle), so the full text is baked into the static HTML.
  const [bodyHtml, setBodyHtml] = useState(post.content || '');
  useEffect(() => {
    if (post.content) { setBodyHtml(post.content); return; }
    let alive = true;
    import('./blog_content.js').then(m => {
      const key = (lang === 'en' && rawPost?.title_en) ? `${post.id}-en` : String(post.id);
      if (alive) setBodyHtml(m.BLOG_CONTENT[key] || m.BLOG_CONTENT[String(post.id)] || '');
    });
    return () => { alive = false; };
  }, [post.id, post.content, lang]);
  // Resolve related products by ref
  const relatedProducts = (post.relatedRefs || [])
    .map(ref => DRESSES.find(d => d.ref === ref))
    .filter(Boolean);
  const dressName = (p) => {
    const raw = isBg ? p.name_bg : p.name_en;
    if (raw && raw !== p.ref && !/^(Style\s)?\d+$/.test(raw.trim())) return raw;
    const col = { demetrios: 'Demetrios', cosmobella: 'Cosmobella', platinum: 'Platinum', destination: 'Destination' }[p.collection] || '';
    return `${col} ${p.ref}`.trim();
  };
  const postPath = blogPostPath(post);
  useSeo({
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    image: post.image, url: postPath, type: "article", lang,
    // Translated posts declare the bg↔en pair from BOTH sides (Google drops
    // one-directional hreflang). Untranslated posts keep the default (none).
    alternates: rawPost?.title_en ? { bg: postPath, en: `/en${postPath}` } : null,
    keywords: `${post.title}, ${post.category}, блог Арети, булчински рокли`,
    jsonLd: {
      "@graph": [
        articleSchema(post, lang),
        breadcrumbSchema([
          { name: "Арети",     url: "/" },
          { name: "Блог",      url: "/blog" },
          { name: post.title,  url: postPath },
        ]),
        ...(post.faq?.length ? [faqSchema(post.faq)] : []),
      ],
    },
    jsonLdId: `post-${post.id}`,
  });

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="blog-post-hero">
        {post.image && (
          <img src={cdnImage(post.image, 1400)} alt={post.title} className="blog-post-hero-img" loading="eager" decoding="sync" />
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

      {/* Content + Sidebar layout */}
      <div className="blog-post-layout">
        {/* Main content */}
        <div className="blog-post-body">
          <button
            className="btn-link"
            style={{ marginBottom: 40, display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={() => setRoute("blog")}
          >
            ← {isBg ? "Обратно към дневника" : "Back to journal"}
          </button>

          {/* Mobile sidebar — horizontal scroll strip */}
          {relatedProducts.length > 0 && (
            <div className="blog-sidebar-mobile">
              <h2 className="blog-sidebar-label">{isBg ? "Препоръчани рокли" : "Recommended gowns"}</h2>
              <div className="blog-sidebar-scroll">
                {relatedProducts.map(p => (
                  <article key={p.ref} className="blog-sidebar-card" onClick={() => goProduct && goProduct(p.ref)}>
                    <img src={cdnImage(p.imgs?.[0] || p.img, 600)} alt={dressName(p)} loading="lazy" decoding="async" />
                    <div className="blog-sidebar-card-info">
                      <h3><a href={`${isBg ? "" : "/en"}/product/${p.ref}`} onClick={(e) => e.preventDefault()}>{dressName(p)}</a></h3>
                      <span>{isBg ? p.silhouette : (p.silhouette_en || p.silhouette)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(bodyHtml) }}
            onClick={(e) => followInternalLink(e, setRoute)}
          />

          <div style={{ marginTop: 64, paddingTop: 40, borderTop: "1px solid var(--champagne)" }}>
            <button className="btn" onClick={() => setRoute("booking")}>
              {isBg ? "Запази проба →" : "Book a fitting →"}
            </button>
          </div>
        </div>

        {/* Desktop sidebar */}
        {relatedProducts.length > 0 && (
          <aside className="blog-sidebar">
            <div className="blog-sidebar-sticky">
              <h2 className="blog-sidebar-label">{isBg ? "Препоръчани рокли" : "Recommended gowns"}</h2>
              {relatedProducts.map(p => (
                <article key={p.ref} className="blog-sidebar-card" onClick={() => goProduct && goProduct(p.ref)}>
                  <img src={cdnImage(p.imgs?.[0] || p.img, 600)} alt={dressName(p)} loading="lazy" decoding="async" />
                  <div className="blog-sidebar-card-info">
                    <h3><a href={`${isBg ? "" : "/en"}/product/${p.ref}`} onClick={(e) => e.preventDefault()}>{dressName(p)}</a></h3>
                    <span>{isBg ? p.silhouette : (p.silhouette_en || p.silhouette)}</span>
                  </div>
                </article>
              ))}
              <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={() => goBooking && goBooking()}>
                {isBg ? "Запази проба →" : "Book a fitting →"}
              </button>
            </div>
          </aside>
        )}
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
                  ? <img src={cdnImage(op.image, 600)} alt={op.title} loading="lazy" decoding="async"
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
