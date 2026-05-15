import { useEffect } from 'react';
import { getSettings } from './api';

let injected = false;

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

export function useSeoInject() {
  useEffect(() => {
    if (injected) return;
    injected = true;

    getSettings().then(s => {
      if (!s) return;

      if (s.ga_id) {
        injectScript(`https://www.googletagmanager.com/gtag/js?id=${s.ga_id}`);
        injectInlineScript('ga-init', `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${s.ga_id}');
        `);
      }

      if (s.gtm_id) {
        injectInlineScript('gtm-init', `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${s.gtm_id}');
        `);
      }

      if (s.fb_pixel) {
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

      if (s.gsc_verification) {
        injectMeta('google-site-verification', s.gsc_verification);
      }
      if (s.bing_verification) {
        injectMeta('msvalidate.01', s.bing_verification);
      }
      if (s.yandex_verification) {
        injectMeta('yandex-verification', s.yandex_verification);
      }
    }).catch(() => {});
  }, []);
}
