import { useState, useMemo } from 'react';
import { DRESSES, COLLECTIONS } from './data';
import { DressCard } from './home';
import { useSeo, breadcrumbSchema, faqSchema } from './seo';
import { withLang } from './router';

// =====================================================
//  DRESS FINDER QUIZ — "Открий своята рокля"
//
//  Free tool / engineering-as-marketing: a bride answers five questions and
//  gets real styles from our own catalogue, each linking to its product page.
//
//  Two jobs at once:
//   1. Lead gen — the result ends on a "book a fitting" CTA, and the answers
//      tell her (and us) which silhouette/collection she is drawn to.
//   2. SEO — it is an internal-linking hub into the product pages, which are
//      otherwise reachable only from the paginated grids. Contextual links
//      with descriptive anchors are exactly what those pages lack.
//
//  Everything runs client-side off the existing DRESSES data — no backend,
//  no storage, nothing to maintain.
// =====================================================

// Bulgarian keys (they match the data), with English display labels.
const SILHOUETTES = [
  { key: 'А-силует', slug: 'a-siluet',  en: 'A-line' },
  { key: 'Русалка',  slug: 'rusalka',   en: 'Mermaid' },
  { key: 'Принцеса', slug: 'printsesa', en: 'Ball gown' },
];

// Each option carries the scoring weights it contributes. Keeping the weights
// in the data (rather than in branching code) makes the quiz easy to retune.
const QUESTIONS = [
  {
    id: 'silhouette',
    q_bg: 'Кой силует те привлича най-много?',
    q_en: 'Which silhouette draws you in most?',
    opts: [
      { v: 'А-силует', bg: 'А-силует — универсален и елегантен', en: 'A-line — versatile and elegant' },
      { v: 'Русалка',  bg: 'Русалка — подчертава извивките',      en: 'Mermaid — accentuates curves' },
      { v: 'Принцеса', bg: 'Принцеса — обемна, приказна пола',    en: 'Ball gown — full, fairy-tale skirt' },
      { v: '',         bg: 'Още не съм решила',                   en: 'I haven\'t decided yet' },
    ],
  },
  {
    id: 'venue',
    q_bg: 'Каква ще бъде церемонията?',
    q_en: 'What kind of ceremony are you planning?',
    opts: [
      { v: 'church',      bg: 'Църковна или класическа в зала', en: 'Church or classic venue' },
      { v: 'outdoor',     bg: 'Изнесена на открито',            en: 'Outdoor ceremony' },
      { v: 'destination', bg: 'На плаж или в чужбина',          en: 'Beach or destination wedding' },
      { v: 'intimate',    bg: 'Камерна, с най-близките',        en: 'Intimate, close family only' },
    ],
  },
  {
    id: 'fabric',
    q_bg: 'Коя материя ти допада?',
    q_en: 'Which fabric speaks to you?',
    opts: [
      { v: 'lace',       bg: 'Дантела — романтична и класическа', en: 'Lace — romantic and classic' },
      { v: 'tulle',      bg: 'Тюл — лек и въздушен',              en: 'Tulle — light and airy' },
      { v: 'satin',      bg: 'Сатен или микадо — гладък разкош',  en: 'Satin or mikado — smooth luxury' },
      { v: 'beading',    bg: 'Бродерия и мъниста — блясък',       en: 'Embroidery and beading — sparkle' },
      { v: '',           bg: 'Нямам предпочитание',               en: 'No preference' },
    ],
  },
  {
    id: 'budget',
    q_bg: 'Какъв бюджет предвиждаш за роклята?',
    q_en: 'What budget do you have in mind?',
    opts: [
      { v: 'low',  bg: 'До 1 500 €',        en: 'Up to €1,500' },
      { v: 'mid',  bg: '1 500 – 2 500 €',   en: '€1,500 – €2,500' },
      { v: 'high', bg: 'Над 2 500 €',       en: 'Over €2,500' },
      { v: '',     bg: 'Още не съм сигурна', en: 'Not sure yet' },
    ],
  },
  {
    id: 'mood',
    q_bg: 'Какво усещане искаш да оставиш?',
    q_en: 'What impression do you want to leave?',
    opts: [
      { v: 'classic',   bg: 'Класическа елегантност',   en: 'Classic elegance' },
      { v: 'drama',     bg: 'Драматична и запомняща се', en: 'Dramatic and memorable' },
      { v: 'romantic',  bg: 'Романтична и нежна',        en: 'Romantic and soft' },
      { v: 'minimal',   bg: 'Изчистена и модерна',       en: 'Clean and modern' },
    ],
  },
];

// Maps answers → collection affinities. Prices per the public ranges.
const COLLECTION_HINT = {
  venue:  { destination: ['destination'], outdoor: ['destination', 'cosmobella'], church: ['demetrios', 'platinum'], intimate: ['cosmobella', 'demetrios'] },
  budget: { low: ['cosmobella', 'destination'], mid: ['demetrios', 'destination'], high: ['platinum', 'demetrios'] },
  mood:   { classic: ['demetrios'], drama: ['platinum', 'demetrios'], romantic: ['cosmobella', 'destination'], minimal: ['demetrios', 'cosmobella'] },
};

// Fabric answer → substrings to look for in the (English) fabric field.
const FABRIC_MATCH = {
  lace:    ['lace'],
  tulle:   ['tulle'],
  satin:   ['satin', 'mikado', 'dupione', 'taffeta'],
  beading: ['beading', 'beaded', 'embroidery', 'sparkl'],
};

function scoreDress(d, answers) {
  let score = 0;
  if (answers.silhouette && d.silhouette === answers.silhouette) score += 5;

  const fabricKeys = FABRIC_MATCH[answers.fabric] || [];
  const fabric = (d.fabric || '').toLowerCase();
  if (fabricKeys.some(k => fabric.includes(k))) score += 3;

  for (const key of ['venue', 'budget', 'mood']) {
    const wanted = (COLLECTION_HINT[key] || {})[answers[key]] || [];
    const idx = wanted.indexOf(d.collection);
    if (idx === 0) score += 2;
    else if (idx > 0) score += 1;
  }
  // Evening gowns are not bridal — keep them out of wedding-dress results.
  if (d.collection === 'evening') score -= 6;
  return score;
}

function pickMatches(answers, count = 6) {
  return DRESSES
    .map(d => ({ d, s: scoreDress(d, answers) }))
    .sort((a, b) => b.s - a.s || a.d.ref.localeCompare(b.d.ref))
    .slice(0, count)
    .map(x => x.d);
}

const QUIZ_FAQ = {
  bg: [
    { q: 'Как да избера булчинска рокля според фигурата си?', a: 'Започнете от силуета. А-силуетът е най-универсален и ласкае почти всяка фигура. Русалката подчертава извивките и е за булки, които искат чувствена визия. Принцесата акцентира талията и създава приказен обем. В салона можете да пробвате и трите, за да усетите разликата на живо.' },
    { q: 'Колко време преди сватбата да избера роклята?', a: 'Препоръчваме 8 до 12 месеца преди сватбата. Поръчка от Demetrios отнема 3–4 месеца, плюс 1–2 месеца за корекции. Ако времето е по-малко, разполагаме с модели в наличност, които коригираме за 2–3 седмици.' },
    { q: 'Колко струва булчинска рокля в Арети?', a: 'Цените са от 1 000 до 4 000 € според колекцията: Cosmobella 1 000–1 800 €, Destination Romance 1 200–2 000 €, Demetrios 1 500–2 800 € и Demetrios Platinum 2 500–4 000 €.' },
  ],
  en: [
    { q: 'How do I choose a wedding dress for my body type?', a: 'Start with the silhouette. The A-line is the most versatile and flatters almost every figure. The mermaid accentuates curves. The ball gown emphasises the waist and creates fairy-tale volume. You can try all three in the salon to feel the difference.' },
    { q: 'How far in advance should I choose my dress?', a: 'We recommend 8–12 months before the wedding. A Demetrios order takes 3–4 months, plus 1–2 months for alterations. On shorter timelines we have in-stock styles that can be altered in 2–3 weeks.' },
    { q: 'How much does a wedding dress cost at Areti?', a: 'Prices range from €1,000 to €4,000 by collection: Cosmobella €1,000–1,800, Destination Romance €1,200–2,000, Demetrios €1,500–2,800 and Demetrios Platinum €2,500–4,000.' },
  ],
};

function QuizPage({ lang, setRoute, goProduct, goSilhouette, favorites = [], toggleFavorite }) {
  const isBg = lang !== 'en';
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  useSeo({
    title: isBg
      ? 'Коя булчинска рокля ти отива? — тест за силует | Арети'
      : 'Which Wedding Dress Suits You? — Silhouette Quiz | Areti',
    description: isBg
      ? 'Безплатен тест: 5 въпроса и виждате кои булчински рокли Demetrios подхождат на вашата фигура и бюджет — с реални модели от салон Арети, София.'
      : 'Free quiz: answer 5 questions and see which Demetrios wedding dresses suit your figure, style and budget. Results show real styles from Areti salon in Sofia.',
    url: '/kviz',
    lang,
    keywords: isBg
      ? 'как да избера булчинска рокля, булчинска рокля според фигурата, коя рокля ми отива, тест булчинска рокля'
      : 'how to choose a wedding dress, wedding dress for body type, bridal quiz',
    jsonLd: { '@graph': [
      breadcrumbSchema([
        { name: isBg ? 'Начало' : 'Home', url: '/' },
        { name: isBg ? 'Тест за рокля' : 'Dress quiz', url: '/kviz' },
      ]),
      faqSchema(QUIZ_FAQ[isBg ? 'bg' : 'en']),
    ]},
    jsonLdId: 'quiz',
  });

  const matches = useMemo(() => (done ? pickMatches(answers) : []), [done, answers]);
  const isPrerender = typeof window !== 'undefined' && window.__PRERENDER__;

  const choose = (id, v) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restart = () => { setAnswers({}); setStep(0); setDone(false); };

  const q = QUESTIONS[step];

  return (
    <div className="page-enter">
      <div className="collection-head">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>
            {isBg ? 'Начало / Тест за рокля' : 'Home / Dress quiz'}
          </div>
          <h1>
            {isBg ? <>Коя булчинска рокля <em>ти отива?</em></> : <>Which wedding dress <em>suits you?</em></>}
          </h1>
          <p className="collection-intro">
            {isBg
              ? 'Отговорете на 5 кратки въпроса за силует, церемония, материя и бюджет — и ще ви покажем кои модели Demetrios от нашия салон в София подхождат най-добре. Тестът е безплатен и не изисква регистрация.'
              : 'Answer 5 short questions about silhouette, ceremony, fabric and budget — and we will show which Demetrios styles from our Sofia salon suit you best. Free, no sign-up needed.'}
          </p>
        </div>
      </div>

      <section className="quiz-wrap">
        {!done && (
          <div className="quiz-card">
            <div className="quiz-progress">
              {isBg ? `Въпрос ${step + 1} от ${QUESTIONS.length}` : `Question ${step + 1} of ${QUESTIONS.length}`}
              <span className="quiz-bar"><span style={{ width: `${((step) / QUESTIONS.length) * 100}%` }} /></span>
            </div>
            <h2 className="quiz-q">{isBg ? q.q_bg : q.q_en}</h2>
            <div className="quiz-opts">
              {q.opts.map(o => (
                <button key={o.bg} className="quiz-opt" onClick={() => choose(q.id, o.v)}>
                  {isBg ? o.bg : o.en}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button className="btn btn-link quiz-back" onClick={() => setStep(step - 1)}>
                ← {isBg ? 'Назад' : 'Back'}
              </button>
            )}
          </div>
        )}

        {done && (
          <div className="quiz-results">
            <div className="sec-head" style={{ marginBottom: 32 }}>
              <h2>{isBg ? <>Вашите <em>рокли</em></> : <>Your <em>matches</em></>}</h2>
            </div>
            <p className="collection-intro" style={{ marginBottom: 40 }}>
              {isBg
                ? 'Ето моделите, които най-добре отговарят на вашите отговори. Запазете час и ги пробвайте на живо — в салона можете да пробвате неограничен брой рокли.'
                : 'These styles best match your answers. Book a fitting and try them on — you can try as many dresses as you like in the salon.'}
            </p>
            <div className="dress-grid">
              {matches.map(d => (
                <DressCard
                  key={d.ref}
                  d={d}
                  lang={lang}
                  onClick={() => { goProduct && goProduct(d.ref); }}
                  isFav={favorites.includes(d.ref)}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </div>
            <div className="quiz-cta">
              <button className="btn btn-solid" onClick={() => setRoute('booking')}>
                {isBg ? 'Запази час за проба' : 'Book a fitting'} →
              </button>
              <button className="btn" onClick={restart}>
                {isBg ? 'Повтори теста' : 'Retake quiz'}
              </button>
            </div>
          </div>
        )}

        {/* Always-present, crawlable context. Gives the page real content for
            Google (the quiz itself is interactive and invisible to crawlers)
            and links out to the silhouette + collection landing pages. */}
        <div className="quiz-seo">
          <h2>{isBg ? 'Силуетите накратко' : 'The silhouettes at a glance'}</h2>
          <div className="quiz-sil-grid">
            {SILHOUETTES.map(({ key: s, slug, en }) => {
              const n = DRESSES.filter(d => d.silhouette === s).length;
              const text = {
                'А-силует': isBg
                  ? 'Прилепнал корсаж, който плавно се разширява от талията. Най-универсалният силует — подхожда на почти всяка фигура.'
                  : 'A fitted bodice flowing out gently from the waist. The most versatile silhouette, flattering on almost every figure.',
                'Русалка': isBg
                  ? 'Приляга плътно до коляното и се разтваря в ефектен шлейф. За булки, които искат да подчертаят извивките си.'
                  : 'Fitted to the knee then opening into a striking train. For brides who want to accentuate their curves.',
                'Принцеса': isBg
                  ? 'Прилепнал корсет и пищна, обемна пола. Класическата приказна визия за тържествена сватба.'
                  : 'A fitted corset with a full, voluminous skirt. The classic fairy-tale look for a grand wedding.',
              }[s];
              return (
                <div key={s} className="quiz-sil">
                  <h3>
                    <a href={withLang(`/collection/silueti/${slug}`, lang)} onClick={(e) => { e.preventDefault(); goSilhouette && goSilhouette(slug); }}>
                      {isBg ? `Булчински рокли ${s.toLowerCase()}` : `${en} wedding dresses`}
                    </a>
                  </h3>
                  <p>{text}</p>
                  <span className="quiz-sil-count">{n} {isBg ? 'модела' : 'styles'}</span>
                </div>
              );
            })}
          </div>

          <h2 style={{ marginTop: 56 }}>{isBg ? 'Разгледайте по колекция' : 'Browse by collection'}</h2>
          <ul className="quiz-coll-links">
            {COLLECTIONS.filter(c => c.id !== 'evening').map(c => (
              <li key={c.id}>
                <a href={withLang(`/collection/${c.id}`, lang)} onClick={(e) => { e.preventDefault(); setRoute('collection'); }}>
                  {isBg ? `Булчински рокли ${c.label}` : `${c.label} wedding dresses`}
                </a>
              </li>
            ))}
          </ul>

          <h2 style={{ marginTop: 56 }}>{isBg ? 'Често задавани въпроси' : 'Frequently asked questions'}</h2>
          <div className="quiz-faq">
            {QUIZ_FAQ[isBg ? 'bg' : 'en'].map(({ q: question, a }) => (
              <details key={question} {...(isPrerender ? { open: true } : {})}>
                <summary>{question}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export { QuizPage };
