import { useEffect } from 'react';
import { getSettings } from './api';

let injected = false;
const CACHE_KEY = 'areti_settings_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedSettings() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

function cacheSettings(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

const VALID_GA  = /^G-[A-Z0-9]{4,12}$/;
const VALID_GTM = /^GTM-[A-Z0-9]{4,12}$/;
const VALID_AW  = /^AW-\d{8,12}$/;
const VALID_AW_LABEL = /^[A-Za-z0-9_-]{4,40}$/;
const VALID_FB  = /^\d{10,20}$/;
const VALID_META = /^[A-Za-z0-9_-]{10,80}$/;

function injectScript(src, attrs = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const el = document.createElement('script');
  el.src = src;
  el.async = true;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
}

function injectInlineScript(id, code) {
  if (document.getElementById(id)) return;
  const el = document.createElement('script');
  el.id = id;
  el.textContent = code;
  document.head.appendChild(el);
}

function injectMeta(name, content) {
  if (!content) return;
  const attr = name.startsWith('og:') ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applySettings(s) {
  if (!s) return;

  let prefs = { analytics: false, marketing: false };
      try {
        const raw = localStorage.getItem('areti_cookies');
        if (raw === 'all') prefs = { analytics: true, marketing: true };
        else if (raw && raw !== 'essential') prefs = JSON.parse(raw);
      } catch {}
      const allowAnalytics = prefs.analytics;
      const allowMarketing = prefs.marketing;

      // Consent Mode v2: gtag.js is already loaded from index.html with
      // analytics_storage / ad_storage defaulting to denied. Here we push the
      // current consent and add the Ads config when configured.
      // Also: when the admin sets a *different* GA id than the one hardcoded in
      // index.html, run an extra config() so both report side-by-side.
      if (typeof window.gtag === 'function') {
        const consent = {
          analytics_storage: allowAnalytics ? 'granted' : 'denied',
          ad_storage:        allowMarketing ? 'granted' : 'denied',
          ad_user_data:      allowMarketing ? 'granted' : 'denied',
          ad_personalization: allowMarketing ? 'granted' : 'denied',
        };
        try { window.gtag('consent', 'update', consent); } catch {}

        // Optional secondary GA stream from admin
        if (s.ga_id && VALID_GA.test(s.ga_id) && s.ga_id !== 'G-RB14REHZ0P') {
          try { window.gtag('config', s.ga_id, { anonymize_ip: true }); } catch {}
        }

        // Google Ads — register the AW container so clicks and remarketing fire
        const hasAds = s.aw_id && VALID_AW.test(s.aw_id);
        if (hasAds) {
          try { window.gtag('config', s.aw_id); } catch {}
          if (s.aw_booking_label && VALID_AW_LABEL.test(s.aw_booking_label)) {
            window.__aretiAds = { sendBookingConversion: () => {
              try { window.gtag('event', 'conversion', { send_to: `${s.aw_id}/${s.aw_booking_label}` }); } catch {}
            }};
          }
        }
      }

      if (allowAnalytics && s.gtm_id && VALID_GTM.test(s.gtm_id)) {
        injectInlineScript('gtm-init', `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${s.gtm_id}');
        `);
      }

      if (allowMarketing && s.fb_pixel && VALID_FB.test(s.fb_pixel)) {
        injectInlineScript('fb-pixel', `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${s.fb_pixel}');
          fbq('track', 'PageView');
        `);
      }

      if (s.gsc_verification && VALID_META.test(s.gsc_verification)) {
        injectMeta('google-site-verification', s.gsc_verification);
      }
      if (s.bing_verification && VALID_META.test(s.bing_verification)) {
        injectMeta('msvalidate.01', s.bing_verification);
      }
      if (s.yandex_verification && VALID_META.test(s.yandex_verification)) {
        injectMeta('yandex-verification', s.yandex_verification);
      }
}

export function useSeoInject() {
  useEffect(() => {
    if (injected) return;
    injected = true;

    // Apply cached settings immediately (zero latency on repeat visits)
    const cached = getCachedSettings();
    if (cached) applySettings(cached);

    // Defer the network fetch so it never blocks the critical render path.
    // requestIdleCallback fires when the browser is idle; fallback setTimeout.
    const run = () => {
      getSettings().then(s => {
        if (!s) return;
        cacheSettings(s);
        if (!cached) applySettings(s); // first visit — apply after idle
      }).catch(() => {});
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 1500);
    }
  }, []);
}
