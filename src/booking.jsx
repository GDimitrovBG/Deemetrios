import { useState, useMemo, useRef, useEffect } from 'react';
import i18n from './i18n';
import { DRESSES, COLLECTIONS } from './data';
import { useSeo, orgSchema, breadcrumbSchema } from './seo';
import { faqSchema } from './seo-helpers';
import { createBooking } from './api';
import { getAttributionPayload } from './attribution';

// =====================================================
//  BOOKING — 4-step reservation flow
// =====================================================

// Booking emails — BOTH of them — are sent by the server from POST /api/bookings.
//
// The customer confirmation used to be composed here and POSTed to
// /api/email/send-customer with the recipient and the whole HTML body in the
// request. That endpoint had to accept any `to` and any `html` from anyone,
// which made it an open mail relay for info@areti.bg. The server now builds
// that email itself (see server/lib/email.js → bookingCustomerEmail), so the
// only thing the browser sends is the booking.

function StepsBar({ steps, current, setCurrent, maxReached }) {
  return (
    <div className="steps-bar">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`step-item ${i === current ? "active" : ""} ${i < maxReached ? "done" : ""}`}
          onClick={() => i <= maxReached && setCurrent(i)}
        >
          <div className="step-num">{i < maxReached ? "✓" : (i + 1).toString().padStart(2, "0")}</div>
          <div className="step-label">{s}</div>
        </div>
      ))}
    </div>
  );
}

function Step1Type({ t, data, setData, dressRefs, setDressRefs }) {
  const needsDress = data.type === 1;
  const dressMissing = needsDress && dressRefs.length === 0;

  return (
    <div className="booking-form">
      <div className="step-tag">{t.booking.step1_eye}</div>
      <h3>{t.booking.step1_title} <em>{t.booking.step1_title_em || "среща"}</em></h3>
      <p className="help">{t.booking.step1_help}</p>
      {t.booking.step1_note && (
        <div className="booking-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>{t.booking.step1_note}</span>
        </div>
      )}
      <div className="option-cards">
        {t.booking.types.map((typ, i) => (
          <div
            key={i}
            className={`option-card ${data.type === i ? "on" : ""} ${typ.recommended ? "is-recommended" : ""}`}
            onClick={() => setData({ ...data, type: i })}
          >
            {typ.recommended && <div className="oc-badge">★ {typ.tag}</div>}
            {!typ.recommended && <div className="oc-eyebrow">{typ.tag}</div>}
            <h4>{typ.title}</h4>
            <p className="oc-desc">{typ.desc}</p>
            {typ.note && (
              <div className={`oc-note ${typ.recommended ? "is-positive" : "is-requirement"}`}>
                {typ.note}
              </div>
            )}
            <div className="oc-price">{typ.price}</div>
          </div>
        ))}
      </div>

      {/* Inline dress picker when Second Fitting is selected */}
      {needsDress && (
        <div className={`inline-dress-picker ${dressMissing ? "is-missing" : "is-filled"}`}>
          <div className="idp-header">
            <div className="idp-icon">{dressMissing ? "👗" : "✓"}</div>
            <div className="idp-titles">
              <div className="idp-title">{t.booking.step1_pick_dress_title}</div>
              <div className="idp-help">{t.booking.step1_pick_dress_help}</div>
            </div>
          </div>

          {dressRefs.length > 0 && (
            <div className="idp-pills">
              {dressRefs.map(ref => {
                const d = DRESSES.find(x => x.ref === ref);
                const cLabel = COLLECTIONS.find(c => c.id === d?.collection)?.label || '';
                return (
                  <span key={ref} className="summary-ref-pill has-img">
                    {d && <img src={d.img} alt="" className="summary-ref-pill-img" />}
                    <span className="summary-ref-pill-text">
                      {d ? `${cLabel} ${d.ref}` : `Реф. ${ref}`}
                    </span>
                    <button
                      className="summary-ref-remove"
                      onClick={() => setDressRefs(dressRefs.filter(r => r !== ref))}
                      aria-label={t.common.remove}
                    >×</button>
                  </span>
                );
              })}
            </div>
          )}

          <DressSearch t={t} dressRefs={dressRefs} setDressRefs={setDressRefs} />

          {dressMissing && (
            <div className="idp-hint">{t.booking.step1_first_time_hint}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Step3Date({ t, data, setData, lang }) {
  // simple month grid for the next 60 days
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const focusDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

  const firstDay = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const lastDay = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon = 0
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);

  const isPast = (d) => {
    if (d == null) return true;
    const dt = new Date(focusDate.getFullYear(), focusDate.getMonth(), d);
    return dt < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const isSelected = (d) => {
    if (!data.date) return false;
    const dt = new Date(focusDate.getFullYear(), focusDate.getMonth(), d);
    return data.date.getTime() === dt.getTime();
  };
  const isSunday = (d) => {
    if (d == null) return false;
    return new Date(focusDate.getFullYear(), focusDate.getMonth(), d).getDay() === 0;
  };
  const setDate = (d) => {
    if (isPast(d) || isSunday(d)) return;
    setData({ ...data, date: new Date(focusDate.getFullYear(), focusDate.getMonth(), d), time: null });
  };

  // Slot times depend on the day of week:
  //   Mon–Fri: 10:00, 11:30, 13:00, 14:30, 16:00, 17:30
  //   Saturday: 10:30, 12:00, 13:30, 15:00, 16:30
  //   Sunday is closed (calendar already disables it)
  const WEEKDAY_SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"];
  const SATURDAY_SLOTS = ["10:30", "12:00", "13:30", "15:00", "16:30"];
  const slots = data.date && data.date.getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
  const goneSlots = []; // TODO: fetch booked slots from API

  return (
    <div className="booking-form">
      <div className="step-tag">{t.booking.step3_eye}</div>
      <h3>{t.booking.step3_title} <em>{t.booking.step3_title_em}</em></h3>
      <p className="help">{t.booking.step3_help}</p>
      <div className="date-picker">
        <div className="dp-head">
          <button className="filter-chip" onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))} disabled={monthOffset === 0}>‹ Назад</button>
          <span style={{ fontFamily: "var(--f-display)", fontSize: 28 }}>
            {monthNames[focusDate.getMonth()]} <em style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--champagne-deep)" }}>{focusDate.getFullYear()}</em>
          </span>
          <button className="filter-chip" onClick={() => setMonthOffset(Math.min(3, monthOffset + 1))}>Напред ›</button>
        </div>
        <div className="dp-grid">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map(d => <div key={d} className="dp-dow">{d}</div>)}
          {days.map((d, i) => (
            <div
              key={i}
              className={`dp-day ${d == null ? "empty" : ""} ${(isPast(d) || isSunday(d)) ? "disabled" : ""} ${isSelected(d) ? "selected" : ""}`}
              onClick={() => d != null && setDate(d)}
            >{d || ""}</div>
          ))}
        </div>
        {data.date && (
          <div className="times-grid">
            {slots.map(s => (
              <button
                key={s}
                className={`time-slot ${data.time === s ? "on" : ""} ${goneSlots.includes(s) ? "gone" : ""}`}
                onClick={() => !goneSlots.includes(s) && setData({ ...data, time: s, timeConfirmed: false })}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Time selected — confirmation notice */}
      {data.date && data.time && (
        <div className="time-confirm-box">
          {/* Big selected summary */}
          <div className="time-confirm-top">
            <div className="time-confirm-date">
              {data.date.toLocaleDateString(lang === "bg" ? "bg-BG" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div className="time-confirm-time">{data.time}</div>
          </div>

          {/* Interactive checkbox notice */}
          <label
            className={`time-confirm-notice ${data.timeConfirmed ? "is-checked" : ""}`}
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setData({ ...data, timeConfirmed: !data.timeConfirmed })}
          >
            {/* Custom checkbox */}
            <div className={`time-confirm-checkbox ${data.timeConfirmed ? "checked" : ""}`}>
              {data.timeConfirmed && (
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="2 7 5.5 10.5 12 3.5" />
                </svg>
              )}
            </div>
            <div>
              <div className="time-confirm-label">
                {data.timeConfirmed ? "✓ Прочетено и разбрано" : "Прочетете и потвърдете"}
              </div>
              <div className="time-confirm-text">
                Избраният час е <strong>ориентировъчен</strong>. Ще се свържем с вас в рамките на 24 часа, за да потвърдим и уточним всички детайли на пробата.
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}

function Step4Details({ t, data, setData }) {
  const lab = t.booking.labels;
  const c = t.common;
  return (
    <div className="booking-form">
      <div className="step-tag">{t.booking.step4_eye}</div>
      <h3>{t.booking.step4_title} <em>{t.booking.step4_title_em}</em></h3>
      <p className="help">{t.booking.step4_help}</p>
      <div className="fields-row">
        <div className="field">
          <label>{lab.name}</label>
          <input value={data.name || ""} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder={c.placeholder_name} />
        </div>
        <div className="field">
          <label>{lab.phone}</label>
          <input value={data.phone || ""} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+359 ..." />
        </div>
      </div>
      <div className="field">
        <label>{lab.email}</label>
        <input type="email" value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="maria@example.com" />
      </div>
      <div className="field">
        <label>{lab.wedding}</label>
        <input value={data.wedding || ""} onChange={(e) => setData({ ...data, wedding: e.target.value })} placeholder={c.placeholder_wedding} />
      </div>
      <div className="field">
        <label>{lab.budget}</label>
        <select value={data.budget || ""} onChange={(e) => setData({ ...data, budget: e.target.value })} style={{ borderBottom: "1px solid var(--rule)", background: "transparent" }}>
          <option value="">{t.booking.budget_select}</option>
          {t.booking.budget_options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{lab.notes}</label>
        <textarea rows="3" value={data.notes || ""} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="..."></textarea>
      </div>
    </div>
  );
}

function DressSearch({ t, dressRefs, setDressRefs }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return DRESSES
      .filter(d => !dressRefs.includes(d.ref))
      .filter(d =>
        d.ref.toLowerCase().includes(q) ||
        (d.name_bg || '').toLowerCase().includes(q) ||
        (d.name_en || '').toLowerCase().includes(q) ||
        (d.collection || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, dressRefs]);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (ref) => {
    setDressRefs([...dressRefs, ref]);
    setQuery("");
    setOpen(false);
  };

  const colLabel = (id) => COLLECTIONS.find(c => c.id === id)?.label || id;

  return (
    <div className="dress-search" ref={wrapRef}>
      <input
        className="dress-search-input"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query && setOpen(true)}
        placeholder={t.common.search_dress}
      />
      {open && results.length > 0 && (
        <div className="dress-search-dropdown">
          {results.map(d => (
            <div key={d.ref} className="dress-search-item" onClick={() => pick(d.ref)}>
              <img src={d.img} alt="" className="dress-search-thumb" />
              <div className="dress-search-info">
                <span className="dress-search-name">
                  {(d.name_bg && d.name_bg !== d.ref) ? d.name_bg : `${colLabel(d.collection)} ${d.ref}`}
                </span>
                <span className="dress-search-meta">Реф. {d.ref} · {colLabel(d.collection)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && query && results.length === 0 && (
        <div className="dress-search-dropdown">
          <div className="dress-search-empty">{t.common.no_results}</div>
        </div>
      )}
    </div>
  );
}

function Summary({ t, data, lang, dressRefs, setDressRefs, dressRequired = false }) {
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
  const fmtDate = (d) => d ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}` : null;

  const dressInfo = (ref) => DRESSES.find(d => d.ref === ref);
  const colLabel = (id) => COLLECTIONS.find(c => c.id === id)?.label || '';

  const rows = [
    data.type != null ? t.booking.types[data.type].title : null,
    fmtDate(data.date),
    data.time,
    data.name,
  ];
  return (
    <aside className="summary">
      <div className="s-eyebrow">{t.booking.summary_eye}</div>
      <h4>{t.booking.summary_title} <em>·</em></h4>

      <div className={`summary-refs-section ${dressRequired && dressRefs.length === 0 ? 'is-required-empty' : ''}`}>
        <div className="summary-refs-label">
          {t.common.dresses_to_try}
          {dressRequired && <span className="summary-refs-required"> *</span>}
        </div>
        {dressRequired && dressRefs.length === 0 && (
          <div className="summary-refs-warning">{t.booking.dress_required_hint}</div>
        )}
        {dressRefs.length > 0 && (
          <div className="summary-refs-pills">
            {dressRefs.map(ref => {
              const d = dressInfo(ref);
              return (
                <span key={ref} className="summary-ref-pill has-img">
                  {d && <img src={d.img} alt="" className="summary-ref-pill-img" />}
                  <span className="summary-ref-pill-text">
                    {d ? `${colLabel(d.collection)} ${d.ref}` : `Реф. ${ref}`}
                  </span>
                  <button
                    className="summary-ref-remove"
                    onClick={() => setDressRefs(dressRefs.filter(r => r !== ref))}
                    aria-label={t.common.remove}
                  >×</button>
                </span>
              );
            })}
          </div>
        )}
        <DressSearch t={t} dressRefs={dressRefs} setDressRefs={setDressRefs} />
      </div>

      <div style={{ marginTop: 20 }}>
        {t.booking.summary_rows.map((label, i) => (
          <div key={i} className="s-row">
            <span className="label">{label}</span>
            {rows[i] ? <span className="val">{rows[i]}</span> : <span className="val empty">{t.booking.summary_empty}</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mute)", lineHeight: 1.5 }}>
        {t.common.free_note}
      </div>
    </aside>
  );
}

function Confirmation({ t, data, setRoute, lang, dressRefs = [] }) {
  const isBg = lang === "bg";
  const colLabel = (id) => COLLECTIONS.find(c => c.id === id)?.label || '';
  const dressInfo = (ref) => DRESSES.find(d => d.ref === ref);
  return (
    <div className="confirmation page-enter">
      <div className="check">✓</div>
      <h2>{t.booking.confirmation_title} <em>{t.booking.confirmation_title_em}</em></h2>
      <p>{t.booking.confirmation_p}</p>
      <div className="conf-card">
        <div className="s-eyebrow" style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--champagne-deep)", marginBottom: 16 }}>{t.booking.conf_card_title}</div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[3]}</span><span className="val">{data.name}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[0]}</span><span className="val">{t.booking.types[data.type]?.title}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[1]}</span><span className="val">{data.date && data.date.toLocaleDateString(isBg ? "bg-BG" : "en-US")}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[2]}</span><span className="val">{data.time}</span></div>
        {dressRefs.length > 0 && (
          <div className="s-row">
            <span className="label">{isBg ? "Рокли" : "Dresses"}</span>
            <span className="val">{dressRefs.map(ref => { const d = dressInfo(ref); return d ? `${colLabel(d.collection)} ${d.ref}` : ref; }).join(", ")}</span>
          </div>
        )}
      </div>
      <button className="btn" style={{ marginTop: 36 }} onClick={() => setRoute("home")}>{t.booking.back_home} →</button>
    </div>
  );
}

function BookingPage({ lang, setRoute, dress = null }) {
  const t = i18n[lang];
  useSeo({
    title: lang === "bg" ? "Запази час за проба — консултация в Арети" : "Book a Fitting — Consultation at Areti",
    description: lang === "bg"
      ? "Запазете безплатен час за проба на булчински рокли в Арети, София. Лична консултация с експерт, без обвързване. Изберете дата, час и тип консултация."
      : "Book a free wedding dress fitting at Areti, Sofia. Personal consultation with an expert, no obligation. Choose date, time and consultation type.",
    url: "/booking", lang,
    keywords: "запази час булчинска рокля, проба сватбена рокля София, консултация Арети",
    jsonLd: { "@graph": [
      orgSchema(),
      breadcrumbSchema([
        { name: lang === "bg" ? "Начало" : "Home", url: "/" },
        { name: lang === "bg" ? "Запази час" : "Book a Fitting", url: "/booking" },
      ]),
      lang === "bg"
        ? faqSchema([
            { q: "Безплатна ли е пробата?", a: "Да, първата консултация е безплатна. Включва 90 минути с личен консултант, чай, кафе и достъп до цялата колекция." },
            { q: "Трябва ли да избера рокля предварително?", a: "За първа консултация — не е нужно. Ние ще ви помогнем да намерите рокля от колекцията. За втора проба е нужно да сте пробвали рокля при нас преди." },
            { q: "Колко напред трябва да запазя час?", a: "Препоръчваме минимум 2-3 седмици предварително, особено за събота. Можем да намерим час и по-скоро ако имате спешна нужда — обадете се на +359 878 521 660." },
            { q: "Мога ли да доведа приятелки или семейство?", a: "Разбира се! Препоръчваме максимум 2-3 придружаващи за по-спокойна атмосфера и по-лесно вземане на решение." },
            { q: "Колко струват роклите?", a: "Нашите колекции са в ценови диапазон от 1500 до над 4000 евро. По-точна информация ще получите по време на консултацията." },
            { q: "Правите ли промени и нагласяне?", a: "Да, работим с опитни шивачи за точно нагласяне на всяка рокля според вашата фигура." },
          ])
        : faqSchema([
            { q: "Is the fitting free?", a: "Yes, the first consultation is completely free. It includes 90 minutes with a personal consultant, tea, coffee and unlimited access to our full collection." },
            { q: "Do I need to choose a dress beforehand?", a: "For a first consultation — no. We'll help you find the right dress from our collection. For a second fitting, you need to have tried a dress with us previously." },
            { q: "How far in advance should I book?", a: "We recommend booking at least 2-3 weeks in advance, especially for Saturday appointments. We can sometimes accommodate sooner — call us at +359 878 521 660." },
            { q: "Can I bring friends or family?", a: "Absolutely! We recommend a maximum of 2-3 guests for a relaxed atmosphere and easier decision-making." },
            { q: "What is the price range?", a: "Our collections range from €1,500 to over €4,000. More specific pricing will be discussed during your consultation." },
            { q: "Do you offer alterations?", a: "Yes, we work with experienced seamstresses to ensure a perfect fit for every gown." },
          ]),
    ]},
  });
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [done, setDone] = useState(false);
  // The submit used to be fire-and-forget with `.catch(() => {})`, so a booking
  // the server rejected (validation, rate limit, server down) still showed the
  // success screen — a silently lost lead. Now the button waits for the API.
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [dressRefs, setDressRefs] = useState(dress ? [String(dress.ref)] : []);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Type index 1 = "Втора проба" / "Second Fitting" — requires the dress that's being revisited.
  // Type index 0 = "Първа консултация" — exploratory, no dress required.
  const dressRequired = data.type === 1;
  const dressMissing  = dressRequired && dressRefs.length === 0;

  const canNext = () => {
    if (step === 0) {
      if (data.type == null) return false;
      // Type 1 (Second Fitting) requires a dress to be selected before proceeding
      if (data.type === 1 && dressRefs.length === 0) return false;
      return true;
    }
    if (step === 1) return data.date && data.time && data.timeConfirmed;
    if (step === 2) return data.name && data.email && isValidEmail(data.email) && data.phone && !dressMissing;
    return false;
  };

  const maxReached = useMemo(() => {
    let m = 0;
    if (data.type != null) m = 1;
    if (data.date && data.time) m = 2;
    return m;
  }, [data]);

  if (done) return <BookingShell t={t} lang={lang}><Confirmation t={t} data={data} setRoute={setRoute} lang={lang} dressRefs={dressRefs} /></BookingShell>;

  return (
    <BookingShell t={t} lang={lang}>
      <StepsBar steps={t.booking.steps} current={step} setCurrent={setStep} maxReached={maxReached} />
      <div className="booking-body">
        <div>
          {step === 0 && <Step1Type t={t} data={data} setData={setData} dressRefs={dressRefs} setDressRefs={setDressRefs} />}
          {step === 1 && <Step3Date t={t} data={data} setData={setData} lang={lang} />}
          {step === 2 && <Step4Details t={t} data={data} setData={setData} />}
          <div className="step-nav">
            <button className="btn" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} style={{ opacity: step === 0 ? 0.3 : 1 }}>
              ← {t.booking.back}
            </button>
            {step < 2 ? (
              <button className="btn btn-solid" onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }}>
                {t.booking.next} →
              </button>
            ) : (
              <button className="btn btn-solid" onClick={async () => {
                if (!canNext() || sending) return;
                const booking = {
                  id: Math.random().toString(36).slice(2,10) + Date.now().toString(36),
                  createdAt: new Date().toISOString(),
                  name: data.name || "",
                  email: data.email || "",
                  phone: data.phone || "",
                  type: t.booking.types[data.type]?.title || "",
                  date: data.date ? data.date.toLocaleDateString(lang === "bg" ? "bg-BG" : "en-US") : "",
                  time: data.time || "",
                  budget: data.budget || "",
                  notes: data.notes || "",
                  dressRefs: dressRefs || [],
                  status: "new",
                  // Where this lead came from (FB ad vs organic vs direct …).
                  attribution: getAttributionPayload(),
                };
                setSending(true);
                setSendError("");
                try {
                  // `lang` tells the server which language to write the
                  // customer's confirmation email in.
                  await createBooking({ ...booking, lang });
                } catch (e) {
                  setSending(false);
                  setSendError(e?.message || (lang === "bg"
                    ? "Заявката не беше изпратена. Опитайте пак или ни позвънете."
                    : "The request could not be sent. Please try again or call us."));
                  return;
                }
                setSending(false);
                // Conversion pixels fire only once the booking is actually
                // stored — otherwise a failed submit reported a fake lead.
                // Fire Google Ads conversion (no-op if Ads not configured or
                // user declined marketing cookies — see seo-inject.js).
                try { window.__aretiAds?.sendBookingConversion?.(); } catch {}
                // GA4 event regardless of Ads — useful for goals + import to Ads.
                try { window.gtag?.('event', 'booking_request', { event_category: 'booking', event_label: booking.type || 'unknown' }); } catch {}
                // Meta Pixel Lead event (no-op until user grants marketing consent).
                try { window.fbq?.('track', 'Lead', { content_category: 'booking', content_name: booking.type || 'unknown' }); } catch {}
                setDone(true);
              }} disabled={!canNext() || sending} style={{ opacity: canNext() && !sending ? 1 : 0.4 }}>
                {sending ? (lang === "bg" ? "Изпраща се…" : "Sending…") : t.booking.confirm}
              </button>
            )}
          </div>
          {sendError && (
            <p role="alert" style={{ marginTop: 16, color: "#a4342a", fontFamily: "var(--f-serif)", fontSize: 15 }}>
              {sendError}
            </p>
          )}
        </div>
        <Summary t={t} data={data} lang={lang} dressRefs={dressRefs} setDressRefs={setDressRefs} dressRequired={dressRequired} />
      </div>
    </BookingShell>
  );
}

function BookingShell({ t, children, lang }) {
  return (
    <div className="page-enter">
      <div className="booking">
        <div className="booking-head">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>{lang === "en" ? "— Booking" : "— Запазване"}</div>
          <h1>{t.booking.title} <em>{t.booking.title_em}</em></h1>
          <p className="lede">{t.booking.lede}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export { BookingPage };
