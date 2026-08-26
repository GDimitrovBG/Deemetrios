import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Nav, Footer, FloatDial } from './components';
// CookieConsent is always rendered, so legal.jsx (small) stays a static import.
// The legal pages live in the same small file — import them statically too
// (dynamic-importing them would not split, and would only add Suspense churn).
import { CookieConsent, PrivacyPage, TermsPage, CookiePolicyPage, NotFoundPage } from './legal';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle } from './TweaksPanel';
import { useSeoInject } from './seo-inject';
import { pathToState, stateToPath, readInitialState } from './router';
import { captureAttribution } from './attribution';

// Record where this visit came from (UTM / ad-click / referrer) as early as
// possible — before the first client-side navigation rewrites the URL and
// drops the query string. First-touch is kept for the whole session.
captureAttribution();

// -----------------------------------------------------------------------------
// Route pages are code-split so a visitor landing on the home page never
// downloads the (large) catalog / booking / info bundles up front. Each page
// file becomes its own chunk; Vite dedupes the dynamic import() so all exports
// from the same file share one chunk. Big mobile Core-Web-Vitals win.
// -----------------------------------------------------------------------------
const HomePage        = lazy(() => import('./home').then(m => ({ default: m.HomePage })));
const CollectionPage  = lazy(() => import('./catalog').then(m => ({ default: m.CollectionPage })));
const ProductPage     = lazy(() => import('./catalog').then(m => ({ default: m.ProductPage })));
const WishlistPage    = lazy(() => import('./catalog').then(m => ({ default: m.WishlistPage })));
const BookingPage     = lazy(() => import('./booking').then(m => ({ default: m.BookingPage })));
const QuizPage        = lazy(() => import('./quiz').then(m => ({ default: m.QuizPage })));
const AboutPage       = lazy(() => import('./info').then(m => ({ default: m.AboutPage })));
const ContactPage     = lazy(() => import('./info').then(m => ({ default: m.ContactPage })));
const BlogPage        = lazy(() => import('./info').then(m => ({ default: m.BlogPage })));
const BlogPostPage    = lazy(() => import('./info').then(m => ({ default: m.BlogPostPage })));
const DemetriosPage   = lazy(() => import('./info').then(m => ({ default: m.DemetriosPage })));

// Admin panel — lazy loaded, only when #admin hash is used
const AdminPanel = lazy(() => import('./admin'));

// =====================================================
//  APP — Router + Tweaks panel + state
// =====================================================

const TWEAKS = {
  "heroVariant": "split",
  "palette": "champagne",
  "displayFont": "italiana",
  "density": "spacious",
  "showMarquee": true,
  "lang": "bg"
};

export default function App() {
  const initial = useRef(readInitialState()).current;
  const [route, setRouteRaw] = useState(initial.route || "home");
  const [tweaks, setTweak] = useTweaks(TWEAKS);
  // The URL is the source of truth for language (/en/* → English). The stored
  // tweak is only a fallback for the prefix-less Bulgarian URLs, so a visitor
  // landing on an /en link always gets English regardless of past preference.
  const [lang, setLang] = useState(initial.lang === "en" ? "en" : (tweaks.lang || "bg"));
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

  const [activeCollection, setActiveCollection] = useState(initial.collectionId || null);
  const [activeSilhouette, setActiveSilhouette] = useState(initial.silhouetteId || null);
  const [activeProduct, setActiveProduct] = useState(initial.productRef || null);
  const [activeBlogPost, setActiveBlogPost] = useState(initial.blogPostId || null);
  const [favorites, setFavorites] = useState([]);
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

  let page = null;
  switch (route) {
    case "collection": page = <CollectionPage lang={lang} setRoute={setRoute} initCollection={activeCollection} initSilhouette={activeSilhouette} goSilhouette={goSilhouette} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />; break;
    case "product": page = <ProductPage lang={lang} setRoute={setRoute} productRef={activeProduct} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "booking": page = <BookingPage lang={lang} setRoute={setRoute} dress={bookingDress} />; break;
    case "quiz": page = <QuizPage lang={lang} setRoute={setRoute} goProduct={goProduct} goSilhouette={goSilhouette} favorites={favorites} toggleFavorite={toggleFavorite} />; break;
    case "wishlist": page = <WishlistPage lang={lang} setRoute={setRoute} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "about": page = <AboutPage lang={lang} setRoute={setRoute} />; break;
    case "demetrios": page = <DemetriosPage lang={lang} setRoute={setRoute} />; break;
    case "contact": page = <ContactPage lang={lang} setRoute={setRoute} />; break;
    case "blog": page = <BlogPage lang={lang} setRoute={setRoute} goBlogPost={goBlogPost} />; break;
    case "blog-post": page = <BlogPostPage lang={lang} setRoute={setRoute} postId={activeBlogPost} goBlogPost={goBlogPost} goProduct={goProduct} goBooking={goBooking} />; break;
    case "privacy": page = <PrivacyPage lang={lang} setRoute={setRoute} />; break;
    case "terms": page = <TermsPage lang={lang} setRoute={setRoute} />; break;
    case "cookies": page = <CookiePolicyPage lang={lang} setRoute={setRoute} />; break;
    case "not-found": page = <NotFoundPage lang={lang} setRoute={setRoute} />; break;
    case "admin": page = null; break;
    default: page = <HomePage lang={lang} setRoute={setRoute} heroVariant={tweaks.heroVariant} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />;
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
      <TweaksPanel title="Tweaks">
        <TweakSection label="Херо вариант">
          <TweakRadio
            label="Стил"
            value={tweaks.heroVariant}
            onChange={(v) => setTweak("heroVariant", v)}
            options={[
              { label: "Editorial", value: "editorial" },
              { label: "Split", value: "split" },
              { label: "Noir", value: "noir" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Палитра">
          <TweakColor
            label="Тема"
            value={tweaks.palette}
            onChange={(v) => setTweak("palette", v)}
            options={[
              { value: "champagne", colors: ["#f6f1e8", "#c4a373", "#1a1612"] },
              { value: "ivory", colors: ["#faf6ee", "#d9c5a8", "#2a2520"] },
              { value: "blush", colors: ["#f4ebe3", "#e8b4a0", "#1a1612"] },
              { value: "noir", colors: ["#14110d", "#c4a373", "#f5ecd8"] },
            ]}
          />
        </TweakSection>
        <TweakSection label="Типография">
          <TweakSelect
            label="Display шрифт"
            value={tweaks.displayFont}
            onChange={(v) => setTweak("displayFont", v)}
            options={[
              { label: "Italiana (тънък, fashion)", value: "italiana" },
              { label: "Cormorant (класически)", value: "cormorant" },
              { label: "Playfair (контраст)", value: "playfair" },
              { label: "DM Serif (drama)", value: "didone" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Оформление">
          <TweakRadio
            label="Плътност"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { label: "Compact", value: "compact" },
              { label: "Spacious", value: "spacious" },
            ]}
          />
          <TweakToggle
            label="Marquee лента"
            value={tweaks.showMarquee}
            onChange={(v) => setTweak("showMarquee", v)}
          />
        </TweakSection>
        <TweakSection label="Език">
          <TweakRadio
            label="Език"
            value={lang}
            onChange={(v) => setLang(v)}
            options={[
              { label: "Български", value: "bg" },
              { label: "English", value: "en" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// blush palette

