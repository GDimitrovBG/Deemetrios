import { useState, useEffect } from 'react';
import i18n from './i18n';
import { useSeo, breadcrumbSchema } from './seo';

function LegalPage({ page, lang, setRoute }) {
  const t = i18n[lang].legal;
  const content = t[page];
  if (!content) return null;

  useSeo({
    title: content.seo_title,
    description: content.seo_desc,
    url: `/${page}`,
    lang,
    jsonLd: breadcrumbSchema([
      { name: lang === "bg" ? "Начало" : "Home", url: "/" },
      { name: content.title, url: `/${page}` },
    ]),
    jsonLdId: page,
  });

  return (
    <div className="page-enter">
      <div className="legal-page">
        <div className="legal-head">
          <div className="t-eyebrow" style={{ marginBottom: 16 }}>{content.eyebrow}</div>
          <h1>{content.title}</h1>
          <p className="legal-updated">{content.updated}</p>
        </div>
        <div className="legal-body">
          {content.sections.map((s, i) => (
            <div key={i} className="legal-section">
              <h2>{s.title}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          ))}
        </div>
        <div className="legal-footer">
          <p>{content.contact_note}</p>
          <button className="btn" onClick={() => setRoute("home")} style={{ marginTop: 24 }}>
            {lang === "bg" ? "← Начало" : "← Home"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacyPage(props) { return <LegalPage page="privacy" {...props} />; }
function TermsPage(props) { return <LegalPage page="terms" {...props} />; }
function CookiePolicyPage(props) { return <LegalPage page="cookies" {...props} />; }

function loadConsent() {
  try {
    const raw = localStorage.getItem('areti_cookies');
    if (!raw) return null;
    if (raw === 'all') return { analytics: true, marketing: true };
    if (raw === 'essential') return { analytics: false, marketing: false };
    return JSON.parse(raw);
  } catch { return null; }
}

function saveConsent(prefs) {
  localStorage.setItem('areti_cookies', JSON.stringify(prefs));
}

export function getCookieConsent() {
  const prefs = loadConsent();
  if (!prefs) return { analytics: false, marketing: false };
  return prefs;
}

function CookieConsent({ lang, setRoute }) {
  const t = i18n[lang].cookie_banner;
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    setVisible(false);
    window.location.reload();
  };
  const acceptEssential = () => {
    saveConsent({ analytics: false, marketing: false });
    setVisible(false);
  };
  const saveCustom = () => {
    saveConsent({ analytics, marketing });
    setVisible(false);
    if (analytics || marketing) window.location.reload();
  };

  if (!visible) return null;
  return (
    <div className={`cookie-banner ${expanded ? "cookie-expanded" : ""}`}>
      <div className="cookie-inner">
        <div className="cookie-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" style={{ flexShrink: 0, opacity: 0.7 }}>
            <circle cx="12" cy="12" r="10"/><circle cx="8" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="8" r="1" fill="currentColor"/><circle cx="10" cy="14" r="1.4" fill="currentColor"/><circle cx="16" cy="13" r="0.8" fill="currentColor"/>
          </svg>
          <p>{t.text}</p>
        </div>

        {expanded && (
          <div className="cookie-toggles">
            <div className="cookie-toggle-row">
              <div>
                <div className="cookie-cat-name">{t.cat_essential}</div>
                <div className="cookie-cat-desc">{t.cat_essential_desc}</div>
              </div>
              <div className="cookie-toggle cookie-toggle--locked on">
                <div className="cookie-toggle-knob" />
              </div>
            </div>
            <div className="cookie-toggle-row">
              <div>
                <div className="cookie-cat-name">{t.cat_analytics}</div>
                <div className="cookie-cat-desc">{t.cat_analytics_desc}</div>
              </div>
              <button className={`cookie-toggle ${analytics ? "on" : ""}`} onClick={() => setAnalytics(v => !v)}>
                <div className="cookie-toggle-knob" />
              </button>
            </div>
            <div className="cookie-toggle-row">
              <div>
                <div className="cookie-cat-name">{t.cat_marketing}</div>
                <div className="cookie-cat-desc">{t.cat_marketing_desc}</div>
              </div>
              <button className={`cookie-toggle ${marketing ? "on" : ""}`} onClick={() => setMarketing(v => !v)}>
                <div className="cookie-toggle-knob" />
              </button>
            </div>
          </div>
        )}

        <div className="cookie-actions">
          {expanded ? (
            <>
              <button className="btn btn-small" onClick={() => setExpanded(false)}>{lang === "bg" ? "← Назад" : "← Back"}</button>
              <button className="btn btn-small btn-solid" onClick={saveCustom}>{t.save}</button>
            </>
          ) : (
            <>
              <button className="btn btn-small" onClick={acceptEssential}>{t.essential}</button>
              <button className="btn btn-small btn-solid" onClick={acceptAll}>{t.accept}</button>
            </>
          )}
        </div>
        <div className="cookie-bottom-links">
          {!expanded && <a onClick={() => setExpanded(true)} className="cookie-link">{t.manage}</a>}
          <a onClick={() => setRoute("cookies")} className="cookie-link">{t.link}</a>
        </div>
      </div>
    </div>
  );
}

export { PrivacyPage, TermsPage, CookiePolicyPage, CookieConsent };
