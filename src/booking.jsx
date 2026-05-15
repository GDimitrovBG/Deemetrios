import { useState, useMemo, useRef, useEffect } from 'react';
import i18n from './i18n';
import { Img } from './components';
import { DRESSES, COLLECTIONS } from './data';
import { useSeo, orgSchema, breadcrumbSchema } from './seo';
import { createBooking } from './api';

// =====================================================
//  BOOKING — 4-step reservation flow
// =====================================================

const API_BASE = import.meta.env.VITE_API_URL || '';
const ARETI_EMAIL = 'info@demetriosbride-bg.com';
const ARETI_NAME = 'Арети — Bridal Couture';

async function sendBrevoEmail({ to, toName, subject, html }) {
  try {
    await fetch(`${API_BASE}/api/email/send-booking`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to, toName, subject, html }),
    });
  } catch { /* silent — booking still succeeds even if email fails */ }
}

function sendBookingEmails(booking, lang) {
  const isBg = lang === 'bg';
  const { name, email, phone, type, location, date, time, budget, notes, dressRefs } = booking;
  const dressLine = dressRefs?.length ? dressRefs.join(', ') : (isBg ? 'не е избрана' : 'none selected');

  // 1. Email to customer
  if (email) {
    sendBrevoEmail({
      to: email,
      toName: name,
      subject: isBg ? 'Потвърждение за консултация — Арети Bridal' : 'Booking Confirmation — Areti Bridal',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1612;">
          <div style="padding:32px 0;border-bottom:1px solid #e8dfc9;">
            <h1 style="font-size:28px;font-weight:400;margin:0;">Арети <em>Bridal</em></h1>
          </div>
          <div style="padding:32px 0;">
            <p style="font-size:18px;line-height:1.5;margin:0 0 24px;">
              ${isBg ? `Здравейте, ${name || ''}!` : `Hello, ${name || ''}!`}
            </p>
            <p style="font-size:16px;line-height:1.6;color:#4a4540;margin:0 0 24px;">
              ${isBg
                ? 'Получихме заявката Ви за консултация. Ще се свържем с Вас по телефон или имейл в рамките на 24 часа, за да уточним точния час и всички детайли.'
                : 'We have received your consultation request. We will contact you by phone or email within 24 hours to confirm the exact time and all details.'}
            </p>
            <div style="background:#f9f5ed;padding:24px;border-radius:4px;margin:0 0 24px;">
              <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a7556;margin-bottom:16px;">
                ${isBg ? 'Вашата заявка' : 'Your request'}
              </div>
              <table style="width:100%;font-size:14px;line-height:1.8;color:#4a4540;">
                <tr><td style="width:140px;color:#8a7556;">${isBg ? 'Тип' : 'Type'}</td><td>${type}</td></tr>
                <tr><td style="color:#8a7556;">${isBg ? 'Локация' : 'Location'}</td><td>${location}</td></tr>
                <tr><td style="color:#8a7556;">${isBg ? 'Дата' : 'Date'}</td><td>${date}</td></tr>
                <tr><td style="color:#8a7556;">${isBg ? 'Час' : 'Time'}</td><td>${time || (isBg ? 'ще уточним' : 'to be confirmed')}</td></tr>
                ${dressRefs?.length ? `<tr><td style="color:#8a7556;">${isBg ? 'Рокли' : 'Dresses'}</td><td>${dressLine}</td></tr>` : ''}
              </table>
            </div>
            <p style="font-size:14px;color:#8a7556;line-height:1.5;">
              ${isBg ? 'Очакваме Ви с шампанско! ✨' : 'We look forward to seeing you — champagne awaits! ✨'}
            </p>
          </div>
          <div style="padding:20px 0;border-top:1px solid #e8dfc9;font-size:12px;color:#8a7556;">
            Арети — Bridal Couture · София<br>
            <a href="https://demetriosbride-bg.com" style="color:#8a7556;">demetriosbride-bg.com</a>
          </div>
        </div>
      `,
    });
  }

  // 2. Email to Areti (notification)
  sendBrevoEmail({
    to: ARETI_EMAIL,
    toName: ARETI_NAME,
    subject: `Нова консултация: ${name || 'Неизвестен'} — ${type} — ${date}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;color:#1a1612;">
        <h2 style="margin:0 0 16px;font-size:20px;">🗓 Нова заявка за консултация</h2>
        <table style="width:100%;font-size:14px;line-height:2;border-collapse:collapse;">
          <tr><td style="width:130px;font-weight:600;">Име</td><td>${name || '—'}</td></tr>
          <tr><td style="font-weight:600;">Имейл</td><td><a href="mailto:${email}">${email || '—'}</a></td></tr>
          <tr><td style="font-weight:600;">Телефон</td><td><a href="tel:${phone}">${phone || '—'}</a></td></tr>
          <tr style="border-top:1px solid #e8dfc9;"><td style="font-weight:600;">Тип</td><td>${type}</td></tr>
          <tr><td style="font-weight:600;">Локация</td><td>${location}</td></tr>
          <tr><td style="font-weight:600;">Дата</td><td>${date}</td></tr>
          <tr><td style="font-weight:600;">Час</td><td>${time || 'за уточняване'}</td></tr>
          <tr><td style="font-weight:600;">Бюджет</td><td>${budget || '—'}</td></tr>
          <tr><td style="font-weight:600;">Рокли</td><td>${dressLine}</td></tr>
          ${notes ? `<tr style="border-top:1px solid #e8dfc9;"><td style="font-weight:600;">Бележки</td><td>${notes}</td></tr>` : ''}
        </table>
      </div>
    `,
  });
}

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

function Step1Type({ t, data, setData }) {
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
            className={`option-card ${data.type === i ? "on" : ""}`}
            onClick={() => setData({ ...data, type: i })}
          >
            <div className="oc-eyebrow">{typ.tag}</div>
            <h4>{typ.title}</h4>
            <p className="oc-desc">{typ.desc}</p>
            <div className="oc-price">{typ.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step2Location({ t, data, setData }) {
  return (
    <div className="booking-form">
      <div className="step-tag">{t.booking.step2_eye}</div>
      <h3>{t.booking.step2_title} <em>{t.booking.step2_title_em || ""}</em></h3>
      <p className="help">{t.booking.step2_help}</p>
      <div className="option-cards">
        {t.booking.locations.map((loc, i) => (
          <div
            key={i}
            className={`option-card ${data.location === i ? "on" : ""}`}
            onClick={() => setData({ ...data, location: i })}
            style={{ minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          >
            <div>
              <div className="oc-eyebrow">— Студио</div>
              <h4 style={{ fontFamily: "var(--f-display)", fontSize: 48, lineHeight: 0.95, marginBottom: 12 }}>{loc.name}</h4>
              <p className="oc-desc" style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 16 }}>{loc.addr}</p>
            </div>
            <div className="oc-price">{loc.hours}</div>
          </div>
        ))}
      </div>
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

  const slots = ["11:00", "12:00", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30"];
  const goneSlots = ["13:30", "16:30"];

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
      <div className="fields-row">
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
    data.location != null ? t.booking.locations[data.location].name : null,
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

function Confirmation({ t, data, setRoute }) {
  return (
    <div className="confirmation page-enter">
      <div className="check">✓</div>
      <h2>{t.booking.confirmation_title} <em>{t.booking.confirmation_title_em}</em></h2>
      <p>{t.booking.confirmation_p}</p>
      <div className="conf-card">
        <div className="s-eyebrow" style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--champagne-deep)", marginBottom: 16 }}>{t.booking.conf_card_title}</div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[0]}</span><span className="val">{t.booking.types[data.type].title}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[1]}</span><span className="val">{t.booking.locations[data.location].name}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[2]}</span><span className="val">{data.date && data.date.toLocaleDateString(lang === "bg" ? "bg-BG" : "en-US")}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[3]}</span><span className="val">{data.time}</span></div>
      </div>
      <button className="btn" style={{ marginTop: 36 }} onClick={() => setRoute("home")}>{t.booking.back_home} →</button>
    </div>
  );
}

function BookingPage({ lang, setRoute, dress = null }) {
  const t = i18n[lang];
  useSeo({
    title: lang === "bg" ? "Запази час за проба — безплатна консултация в Арети" : "Book a Fitting — Free Consultation at Areti",
    description: lang === "bg"
      ? "Запазете безплатен час за проба на булчински рокли в Арети, София. Лична консултация с експерт, без обвързване. Изберете дата, час и тип консултация."
      : "Book a free wedding dress fitting at Areti, Sofia. Personal consultation with an expert, no obligation. Choose date, time and consultation type.",
    url: "/booking", lang,
    keywords: "запази час булчинска рокля, проба сватбена рокля София, безплатна консултация Арети",
    jsonLd: { "@graph": [
      orgSchema(),
      breadcrumbSchema([
        { name: lang === "bg" ? "Начало" : "Home", url: "/" },
        { name: lang === "bg" ? "Запази час" : "Book a Fitting", url: "/booking" },
      ]),
    ]},
  });
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [done, setDone] = useState(false);
  const [dressRefs, setDressRefs] = useState(dress ? [String(dress.ref)] : []);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Type index 1 = "Втора проба" / "Second Fitting" — requires the dress that's being revisited.
  // Type index 0 = "Първа консултация" — exploratory, no dress required.
  const dressRequired = data.type === 1;
  const dressMissing  = dressRequired && dressRefs.length === 0;

  const canNext = () => {
    if (step === 0) return data.type != null;
    if (step === 1) return data.location != null;
    if (step === 2) return data.date && data.time && data.timeConfirmed;
    if (step === 3) return data.name && data.email && isValidEmail(data.email) && data.phone && !dressMissing;
    return false;
  };

  const maxReached = useMemo(() => {
    let m = 0;
    if (data.type != null) m = 1;
    if (data.location != null) m = 2;
    if (data.date && data.time) m = 3;
    return m;
  }, [data]);

  if (done) return <BookingShell t={t}><Confirmation t={t} data={data} setRoute={setRoute} /></BookingShell>;

  return (
    <BookingShell t={t}>
      <StepsBar steps={t.booking.steps} current={step} setCurrent={setStep} maxReached={maxReached} />
      <div className="booking-body">
        <div>
          {step === 0 && <Step1Type t={t} data={data} setData={setData} />}
          {step === 1 && <Step2Location t={t} data={data} setData={setData} />}
          {step === 2 && <Step3Date t={t} data={data} setData={setData} lang={lang} />}
          {step === 3 && <Step4Details t={t} data={data} setData={setData} />}
          <div className="step-nav">
            <button className="btn" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} style={{ opacity: step === 0 ? 0.3 : 1 }}>
              ← {t.booking.back}
            </button>
            {step < 3 ? (
              <button className="btn btn-solid" onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }}>
                {t.booking.next} →
              </button>
            ) : (
              <button className="btn btn-solid" onClick={() => {
                if (!canNext()) return;
                const booking = {
                  id: Math.random().toString(36).slice(2,10) + Date.now().toString(36),
                  createdAt: new Date().toISOString(),
                  name: data.name || "",
                  email: data.email || "",
                  phone: data.phone || "",
                  type: t.booking.types[data.type]?.title || "",
                  location: t.booking.locations[data.location]?.name || "",
                  date: data.date ? data.date.toLocaleDateString(lang === "bg" ? "bg-BG" : "en-US") : "",
                  time: data.time || "",
                  budget: data.budget || "",
                  notes: data.notes || "",
                  dressRefs: dressRefs || [],
                  status: "new",
                };
                createBooking(booking).catch(() => {});
                sendBookingEmails(booking, lang);
                setDone(true);
              }} disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }}>
                {t.booking.confirm}
              </button>
            )}
          </div>
        </div>
        <Summary t={t} data={data} lang={lang} dressRefs={dressRefs} setDressRefs={setDressRefs} dressRequired={dressRequired} />
      </div>
    </BookingShell>
  );
}

function BookingShell({ t, children }) {
  return (
    <div className="page-enter">
      <div className="booking">
        <div className="booking-head">
          <div className="t-eyebrow" style={{ marginBottom: 24 }}>— Запазване</div>
          <h1>{t.booking.title} <em>{t.booking.title_em}</em></h1>
          <p className="lede">{t.booking.lede}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export { BookingPage };
