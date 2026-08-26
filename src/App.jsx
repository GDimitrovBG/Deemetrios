import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Nav, Footer, FloatDial } from './components';
// CookieConsent is always rendered, so legal.jsx (small) stays a static import.
// The legal pages live in the same small file — import them statically too
// (dynamic-importing them would not split, and would only add Suspense churn).
import { CookieConsent, PrivacyPage, TermsPage, CookiePolicyPage, NotFoundPage } from './legal';
import { useTweaks } from './tweaks';
import { useSeoInject } from './seo-inject';
import { pathToState, stateToPath, readInitialState } from './router';
import { pageFor } from './pages';
import { captureAttribution } from './attribution';

// Record where this visit came from (UTM / ad-click / referrer) as early as
// possible — before the first client-side navigation rewrites the URL and
// drops the query string. First-touch is kept for the whole session.
captureAttribution();

// Route pages come from ./pages, which code-splits them exactly as React.lazy
// did but lets main.jsx resolve the LANDING route before the first render — see
// the note there for why that matters on a prerendered page.

// Admin panel — lazy loaded, only when #admin hash is used
const AdminPanel = lazy(() => import('./admin'));

// =====================================================
//  APP — Router + site preferences + state
// =====================================================

const FAVORITES_KEY = 'areti_favorites';

function readFavorites() {
  if (typeof window === 'undefined' || window.__PRERENDER__) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    // Guard against a hand-edited or half-written value.
    return Array.isArray(raw) ? raw.filter(r => typeof r === 'string').slice(0, 200) : [];
  } catch { return []; }
}

function writeFavorites(refs) {
  if (typeof window === 'undefined' || window.__PRERENDER__) return;
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(refs)); } catch { /* storage blocked */ }
}

// Site defaults. A returning visitor's stored choices (see tweaks.js) are
// layered on top of these.
const TWEAKS = {
  "heroVariant": "split",
  "palette": "champagne",
  "displayFont": "italiana",
  "density": "spacious",
  "showMarquee": true,
  "lang": "bg"
};

export default function App() {
  // Lazy initialiser, not `useRef(readInitialState())`: the argument form is
  // evaluated on EVERY render, so the router ran its full match — and could
  // call history.replaceState — each time anything in the app re-rendered.
  const initial = useRef(null);
  if (initial.current === null) initial.current = readInitialState();
  const initialState = initial.current;
  const [route, setRouteRaw] = useState(initialState.route || "home");
  const [tweaks, setTweak] = useTweaks(TWEAKS);
  // The URL is the source of truth for language (/en/* → English). The stored
  // tweak is only a fallback for the prefix-less Bulgarian URLs, so a visitor
  // landing on an /en link always gets English regardless of past preference.
  const [lang, setLang] = useState(initialState.lang === "en" ? "en" : (tweaks.lang || "bg"));
  useSeoInject();

  const setRoute = (r) => {
    setRouteRaw(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Access admin via URL hash: localhost:5173/#admin
  useEffect(() => {
    if (window.location.hash === "#admin") setRouteRaw("admin");
    const onHash = () => { if (window.location.hash === "#admin") setRouteRaw("admin"); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.className =
      tweaks.palette === "noir" ? "theme-noir" :
      tweaks.palette === "blush" ? "theme-blush" :
      tweaks.palette === "ivory" ? "theme-ivory" : "";

    // density
    document.documentElement.style.setProperty("--s-9", tweaks.density === "compact" ? "64px" : "96px");
    document.documentElement.style.setProperty("--s-10", tweaks.density === "compact" ? "88px" : "128px");

    // display font
    const fonts = {
      italiana: '"Italiana", "Cormorant Garamond", serif',
      cormorant: '"Cormorant Garamond", serif',
      playfair: '"Playfair Display", "Cormorant Garamond", serif',
      didone: '"DM Serif Display", "Italiana", serif',
    };
    document.documentElement.style.setProperty("--f-display", fonts[tweaks.displayFont] || fonts.italiana);
  }, [tweaks]);

  useEffect(() => {
    if (lang !== tweaks.lang) setTweak("lang", lang);
  }, [lang]);

  const [activeCollection, setActiveCollection] = useState(initialState.collectionId || null);
  const [activeSilhouette, setActiveSilhouette] = useState(initialState.silhouetteId || null);
  const [activeProduct, setActiveProduct] = useState(initialState.productRef || null);
  const [activeBlogPost, setActiveBlogPost] = useState(initialState.blogPostId || null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [bookingDress, setBookingDress] = useState(null);

  // Sync state → URL whenever route or its params change
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) { firstSync.current = false; return; }
    if (route === "admin" || route === "not-found") return;
    const path = stateToPath({ route, collectionId: activeCollection, productRef: activeProduct, blogPostId: activeBlogPost, silhouetteId: activeSilhouette, lang });
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [route, activeCollection, activeSilhouette, activeProduct, activeBlogPost, lang]);

  // Sync URL → state on back/forward
  useEffect(() => {
    const onPop = () => {
      if (window.location.hash === "#admin") { setRouteRaw("admin"); return; }
      const s = pathToState(window.location.pathname);
      if (s.redirect) {
        window.history.replaceState({}, "", s.redirect);
        const next = pathToState(s.redirect);
        if (next.route) {
          setRouteRaw(next.route);
          setActiveCollection(next.collectionId || null);
          setActiveSilhouette(next.silhouetteId || null);
          setActiveProduct(next.productRef || null);
          setActiveBlogPost(next.blogPostId || null);
        }
      } else if (s.route) {
        setRouteRaw(s.route);
        if (s.lang) setLang(s.lang);
        setActiveCollection(s.collectionId || null);
        setActiveSilhouette(s.silhouetteId || null);
        setActiveProduct(s.productRef || null);
        setActiveBlogPost(s.blogPostId || null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Stable identity so memoized DressCards don't all re-render on every toggle.
  const toggleFavorite = useCallback((ref) => {
    setFavorites(prev => prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]);
  }, []);

  // Persist the wishlist. It used to live in component state only, so every
  // heart a visitor tapped was gone the moment they reloaded, opened a dress in
  // a new tab, or came back the next day — which is the entire point of a
  // wishlist on a boutique site where the decision takes weeks.
  useEffect(() => { writeFavorites(favorites); }, [favorites]);

  const goCollection = (id = null) => {
    setActiveCollection(id);
    setActiveSilhouette(null);
    setRoute("collection");
  };

  const goSilhouette = (id) => {
    setActiveCollection(null);
    setActiveSilhouette(id);
    setRoute("collection");
  };

  const goProduct = (ref) => {
    setActiveProduct(ref);
    setRoute("product");
  };

  const goBlogPost = (id) => {
    setActiveBlogPost(id);
    setRoute("blog-post");
  };

  const goBooking = (dress = null) => {
    setBookingDress(dress);
    setRoute("booking");
  };

  const transparent = route === "home" && tweaks.heroVariant !== "split";

  // The component comes from the registry; the switch only decides its props.
  const Page = pageFor(route);
  let page = null;
  switch (route) {
    case "collection": page = <Page lang={lang} setRoute={setRoute} initCollection={activeCollection} initSilhouette={activeSilhouette} goSilhouette={goSilhouette} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />; break;
    case "product": page = <Page lang={lang} setRoute={setRoute} productRef={activeProduct} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "booking": page = <Page lang={lang} setRoute={setRoute} dress={bookingDress} />; break;
    case "quiz": page = <Page lang={lang} setRoute={setRoute} goProduct={goProduct} goSilhouette={goSilhouette} favorites={favorites} toggleFavorite={toggleFavorite} />; break;
    case "wishlist": page = <Page lang={lang} setRoute={setRoute} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "about":
    case "demetrios":
    case "contact": page = <Page lang={lang} setRoute={setRoute} />; break;
    case "blog": page = <Page lang={lang} setRoute={setRoute} goBlogPost={goBlogPost} />; break;
    case "blog-post": page = <Page lang={lang} setRoute={setRoute} postId={activeBlogPost} goBlogPost={goBlogPost} goProduct={goProduct} goBooking={goBooking} />; break;
    // Legal pages and the 404 shell are small and statically imported.
    case "privacy": page = <PrivacyPage lang={lang} setRoute={setRoute} />; break;
    case "terms": page = <TermsPage lang={lang} setRoute={setRoute} />; break;
    case "cookies": page = <CookiePolicyPage lang={lang} setRoute={setRoute} />; break;
    case "not-found": page = <NotFoundPage lang={lang} setRoute={setRoute} />; break;
    case "admin": page = null; break;
    default: {
      const Home = pageFor("home");
      page = <Home lang={lang} setRoute={setRoute} heroVariant={tweaks.heroVariant} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />;
      break;
    }
  }

  if (route === "admin") return (
    <Suspense fallback={<div style={{ display:"grid", placeItems:"center", height:"100vh", fontFamily:"var(--f-serif)", fontSize:18, color:"var(--ink-soft)" }}>Зарежда…</div>}>
      <AdminPanel setRoute={setRoute} />
    </Suspense>
  );

  return (
    <>
      <Nav route={route} setRoute={setRoute} lang={lang} setLang={setLang} transparent={transparent} goCollection={goCollection} favorites={favorites} />
      <main>
        <Suspense fallback={<div style={{ minHeight: "70vh" }} aria-busy="true" />}>
          {page}
        </Suspense>
      </main>
      <Footer lang={lang} setRoute={setRoute} goCollection={goCollection} />
      <FloatDial setRoute={setRoute} lang={lang} />
      <CookieConsent lang={lang} setRoute={setRoute} />
    </>
  );
}


