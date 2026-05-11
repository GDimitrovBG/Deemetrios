// =====================================================
//  APP — Router + Tweaks panel + state
// =====================================================

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAKS = /*EDITMODE-BEGIN*/{
  "heroVariant": "editorial",
  "palette": "champagne",
  "displayFont": "italiana",
  "density": "spacious",
  "showMarquee": true,
  "lang": "bg"
}/*EDITMODE-END*/;

function App() {
  const [route, setRouteRaw] = useStateA("home");
  const [tweaks, setTweak] = window.useTweaks(TWEAKS);
  const [lang, setLang] = useStateA(tweaks.lang || "bg");

  const setRoute = (r) => {
    setRouteRaw(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffectA(() => {
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

  useEffectA(() => {
    if (lang !== tweaks.lang) setTweak("lang", lang);
  }, [lang]);

  const transparent = route === "home" && tweaks.heroVariant !== "split";

  let page = null;
  switch (route) {
    case "collection": page = <CollectionPage lang={lang} setRoute={setRoute} />; break;
    case "product": page = <ProductPage lang={lang} setRoute={setRoute} />; break;
    case "accessories": page = <AccessoriesPage lang={lang} setRoute={setRoute} />; break;
    case "booking": page = <BookingPage lang={lang} setRoute={setRoute} />; break;
    case "about": page = <AboutPage lang={lang} setRoute={setRoute} />; break;
    case "contact": page = <ContactPage lang={lang} setRoute={setRoute} />; break;
    case "blog": page = <BlogPage lang={lang} setRoute={setRoute} />; break;
    default: page = <HomePage lang={lang} setRoute={setRoute} heroVariant={tweaks.heroVariant} />;
  }

  return (
    <>
      <Nav route={route} setRoute={setRoute} lang={lang} setLang={setLang} transparent={transparent} />
      <main>{page}</main>
      <Footer lang={lang} setRoute={setRoute} />
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Херо вариант">
          <window.TweakRadio
            label="Стил"
            value={tweaks.heroVariant}
            onChange={(v) => setTweak("heroVariant", v)}
            options={[
              { label: "Editorial", value: "editorial" },
              { label: "Split", value: "split" },
              { label: "Noir", value: "noir" },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection label="Палитра">
          <window.TweakColor
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
        </window.TweakSection>
        <window.TweakSection label="Типография">
          <window.TweakSelect
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
        </window.TweakSection>
        <window.TweakSection label="Оформление">
          <window.TweakRadio
            label="Плътност"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { label: "Compact", value: "compact" },
              { label: "Spacious", value: "spacious" },
            ]}
          />
          <window.TweakToggle
            label="Marquee лента"
            value={tweaks.showMarquee}
            onChange={(v) => setTweak("showMarquee", v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Език">
          <window.TweakRadio
            label="Език"
            value={lang}
            onChange={(v) => setLang(v)}
            options={[
              { label: "Български", value: "bg" },
              { label: "English", value: "en" },
            ]}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

// blush palette
const blushStyle = document.createElement("style");
blushStyle.textContent = `
.theme-blush {
  --bg: #f4ebe3;
  --bg-soft: #faf3ec;
  --bg-deep: #e8d5c4;
  --paper: #fff8f1;
  --champagne: #c89b85;
  --champagne-deep: #a07560;
  --rule: #dcc4b3;
  --rule-soft: #ead7c8;
}
.theme-ivory {
  --bg: #faf6ee;
  --bg-soft: #fdf9f1;
  --bg-deep: #efe6d2;
  --paper: #ffffff;
  --rule: #e2d9c2;
  --rule-soft: #ede5d3;
}
`;
document.head.appendChild(blushStyle);

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
