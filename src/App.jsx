import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Nav, Footer, FloatDial } from './components';
import { HomePage } from './home';
import { CollectionPage, ProductPage, AccessoriesPage, WishlistPage } from './catalog';
import { BookingPage } from './booking';
import { AboutPage, ContactPage, BlogPage, BlogPostPage, DemetriosPage } from './info';
import { PrivacyPage, TermsPage, CookiePolicyPage, CookieConsent } from './legal';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle } from './TweaksPanel';
import { useSeoInject } from './seo-inject';
import { pathToState, stateToPath, readInitialState } from './router';

// Heavy pages loaded only when needed
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
  const [lang, setLang] = useState(tweaks.lang || "bg");
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
  const [activeProduct, setActiveProduct] = useState(initial.productRef || null);
  const [activeBlogPost, setActiveBlogPost] = useState(initial.blogPostId || null);
  const [favorites, setFavorites] = useState([]);
  const [bookingDress, setBookingDress] = useState(null);

  // Sync state → URL whenever route or its params change
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) { firstSync.current = false; return; }
    if (route === "admin") return;
    const path = stateToPath({ route, collectionId: activeCollection, productRef: activeProduct, blogPostId: activeBlogPost });
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [route, activeCollection, activeProduct, activeBlogPost]);

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
          setActiveProduct(next.productRef || null);
          setActiveBlogPost(next.blogPostId || null);
        }
      } else if (s.route) {
        setRouteRaw(s.route);
        setActiveCollection(s.collectionId || null);
        setActiveProduct(s.productRef || null);
        setActiveBlogPost(s.blogPostId || null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleFavorite = (ref) => {
    setFavorites(prev => prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]);
  };

  const goCollection = (id = null) => {
    setActiveCollection(id);
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
    case "collection": page = <CollectionPage lang={lang} setRoute={setRoute} initCollection={activeCollection} favorites={favorites} toggleFavorite={toggleFavorite} goProduct={goProduct} />; break;
    case "product": page = <ProductPage lang={lang} setRoute={setRoute} productRef={activeProduct} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "accessories": page = <AccessoriesPage lang={lang} setRoute={setRoute} />; break;
    case "booking": page = <BookingPage lang={lang} setRoute={setRoute} dress={bookingDress} />; break;
    case "wishlist": page = <WishlistPage lang={lang} setRoute={setRoute} favorites={favorites} toggleFavorite={toggleFavorite} goBooking={goBooking} goProduct={goProduct} />; break;
    case "about": page = <AboutPage lang={lang} setRoute={setRoute} />; break;
    case "demetrios": page = <DemetriosPage lang={lang} setRoute={setRoute} />; break;
    case "contact": page = <ContactPage lang={lang} setRoute={setRoute} />; break;
    case "blog": page = <BlogPage lang={lang} setRoute={setRoute} goBlogPost={goBlogPost} />; break;
    case "blog-post": page = <BlogPostPage lang={lang} setRoute={setRoute} postId={activeBlogPost} goBlogPost={goBlogPost} goProduct={goProduct} goBooking={goBooking} />; break;
    case "privacy": page = <PrivacyPage lang={lang} setRoute={setRoute} />; break;
    case "terms": page = <TermsPage lang={lang} setRoute={setRoute} />; break;
    case "cookies": page = <CookiePolicyPage lang={lang} setRoute={setRoute} />; break;
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
      <main>{page}</main>
      <Footer lang={lang} setRoute={setRoute} />
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

