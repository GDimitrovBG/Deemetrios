// =====================================================
//  MARKETING ATTRIBUTION
//
//  Answers "did this booking come from a Facebook ad or from organic?"
//  without asking the visitor.
//
//  How it works:
//   • On the first page load we read the UTM parameters, ad-click ids
//     (gclid/fbclid) and the referrer, and store them in localStorage.
//   • FIRST-touch is written once and never overwritten — it records where
//     the visitor originally came from, even if they browse 10 pages or come
//     back days later before booking.
//   • LAST-touch is refreshed on every new external entry, so we also know
//     what they clicked right before converting.
//   • getAttributionPayload() hands both to the booking form; the server
//     stores them and the admin panel / email show a plain-language label.
//
//  IMPORTANT — fbclid alone does NOT mean "ad". Facebook appends fbclid to
//  EVERY outbound link, organic posts included. Only utm_medium=paid_social
//  (which the ad account must set in the ad's URL parameters) reliably marks
//  paid traffic. classifyTouch() encodes exactly that.
// =====================================================

const STORE_KEY = 'areti_attr';
const MAX = 200; // hard cap on any stored string

const clip = (v) => (v == null ? '' : String(v).slice(0, MAX));

function readParams() {
  try {
    const q = new URLSearchParams(window.location.search);
    const get = (k) => clip(q.get(k) || '');
    return {
      source:   get('utm_source'),
      medium:   get('utm_medium'),
      campaign: get('utm_campaign'),
      content:  get('utm_content'),
      term:     get('utm_term'),
      gclid:    get('gclid'),
      fbclid:   get('fbclid'),
    };
  } catch { return { source:'', medium:'', campaign:'', content:'', term:'', gclid:'', fbclid:'' }; }
}

function referrerHost() {
  try {
    const r = document.referrer;
    if (!r) return '';
    const h = new URL(r).hostname.replace(/^www\./, '');
    // Same-site navigations are not an acquisition source.
    if (h === window.location.hostname.replace(/^www\./, '')) return '';
    return h;
  } catch { return ''; }
}

// A touch is "meaningful" (worth recording) if it carries any campaign signal
// or arrives from an external site. Plain internal navigation is ignored so it
// can never overwrite the real last-touch source.
function buildTouch() {
  const p = readParams();
  const ref = referrerHost();
  const hasSignal = p.source || p.medium || p.gclid || p.fbclid || ref;
  if (!hasSignal) return null;
  return {
    ...p,
    referrer: ref,
    landing: clip(window.location.pathname),
    // Wall-clock timestamp captured client-side; the server records its own
    // createdAt on the booking, so this is only informational.
    ts: new Date().toISOString(),
  };
}

const PAID_MEDIA = ['paid_social', 'paidsocial', 'cpc', 'ppc', 'paid', 'display', 'paid_search'];
const SOCIAL_HOSTS = /(facebook\.com|fb\.com|instagram\.com|l\.facebook|lm\.facebook|m\.facebook)/i;
const SEARCH_HOSTS = /(google\.|bing\.com|yahoo\.|duckduckgo\.com|yandex\.)/i;

function platformFromSource(src, host) {
  const s = (src || '').toLowerCase();
  if (/(^|[^a-z])(fb|facebook)([^a-z]|$)/.test(s) || /facebook/i.test(host)) return 'Facebook';
  if (/(^|[^a-z])(ig|instagram)([^a-z]|$)/.test(s) || /instagram/i.test(host)) return 'Instagram';
  if (/google/i.test(s) || /google\./i.test(host)) return 'Google';
  return src || host || '';
}

/**
 * Turn a touch into a { kind, platform, campaign, content, label } summary.
 * `label` is the Bulgarian string shown in the admin panel and email.
 */
export function classifyTouch(touch) {
  if (!touch) return { kind: 'direct', platform: '', campaign: '', content: '', label: 'Директно / запазен линк' };
  const { source, medium, campaign, content, gclid, fbclid, referrer } = touch;
  const med = (medium || '').toLowerCase();
  const camp = campaign ? ` · кампания ${campaign}` : '';
  const cont = content ? ` · реклама ${content}` : '';

  // 1) Explicitly tagged paid traffic (the reliable signal).
  if (PAID_MEDIA.includes(med)) {
    const platform = platformFromSource(source, referrer) || 'реклама';
    return { kind: 'paid', platform, campaign, content, label: `Платена реклама (${platform})${camp}${cont}` };
  }
  // 2) Google Ads click id.
  if (gclid) return { kind: 'paid', platform: 'Google Ads', campaign, content, label: `Google Ads${camp}` };

  // 3) Any other tagged campaign (email, newsletter, partner…).
  if (source || medium) {
    const platform = platformFromSource(source, referrer);
    return { kind: 'campaign', platform, campaign, content, label: `Кампания: ${source || medium}${camp}${cont}` };
  }

  // 4) Untagged social. fbclid or a facebook/instagram referrer — could be an
  //    organic post OR an ad whose URL parameters were not set. Say so honestly.
  if (fbclid || SOCIAL_HOSTS.test(referrer || '')) {
    const platform = /instagram/i.test(referrer || '') ? 'Instagram' : 'Facebook';
    return { kind: 'organic_social', platform, campaign: '', content: '', label: `${platform} (органично или реклама без UTM)` };
  }
  // 5) Organic search.
  if (SEARCH_HOSTS.test(referrer || '')) {
    const eng = /bing/i.test(referrer) ? 'Bing' : /yahoo/i.test(referrer) ? 'Yahoo' : 'Google';
    return { kind: 'organic_search', platform: eng, campaign: '', content: '', label: `Органично търсене (${eng})` };
  }
  // 6) Referral from another site.
  if (referrer) return { kind: 'referral', platform: referrer, campaign: '', content: '', label: `Реферал: ${referrer}` };

  return { kind: 'direct', platform: '', campaign: '', content: '', label: 'Директно / запазен линк' };
}

/** Capture the current touch. Call once on app load. */
export function captureAttribution() {
  // Never run during the build-time prerender crawl.
  if (typeof window === 'undefined' || window.__PRERENDER__) return;
  const touch = buildTouch();
  if (!touch) return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    if (!store.first) store.first = touch; // first-touch is immutable
    store.last = touch;                    // last-touch always refreshes
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* storage blocked — nothing to persist, feature just no-ops */ }
}

/**
 * Attribution to attach to a booking. Returns null when nothing was ever
 * captured (pure direct traffic with storage available but no signal).
 */
export function getAttributionPayload() {
  if (typeof window === 'undefined') return null;
  let store = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    store = raw ? JSON.parse(raw) : null;
  } catch { /* ignore */ }
  const first = store?.first || null;
  const last = store?.last || null;
  const label = classifyTouch(first).label;
  // Note the last-touch too when it differs from the acquisition source.
  const lastLabel = last && JSON.stringify(last) !== JSON.stringify(first)
    ? classifyTouch(last).label : '';
  return { first, last, label, lastLabel };
}
