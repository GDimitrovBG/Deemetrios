import { useState, useMemo, useRef } from 'react';
import i18n from './i18n';
import { Img } from './components';

// =====================================================
//  BOOKING — 4-step reservation flow
// =====================================================

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

function Step3Date({ t, data, setData }) {
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
    return new Date(focusDate.getFullYear(), focusDate.getMonth(), d).getDay() === 1;
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
              {data.date.toLocaleDateString("bg-BG", { weekday: "long", day: "numeric", month: "long" })}
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
  return (
    <div className="booking-form">
      <div className="step-tag">{t.booking.step4_eye}</div>
      <h3>{t.booking.step4_title} <em>{t.booking.step4_title_em}</em></h3>
      <p className="help">{t.booking.step4_help}</p>
      <div className="fields-row">
        <div className="field">
          <label>{lab.name}</label>
          <input value={data.name || ""} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Мария Иванова" />
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
          <input value={data.wedding || ""} onChange={(e) => setData({ ...data, wedding: e.target.value })} placeholder="Септември 2026" />
        </div>
        <div className="field">
          <label>{lab.budget}</label>
          <select value={data.budget || ""} onChange={(e) => setData({ ...data, budget: e.target.value })} style={{ borderBottom: "1px solid var(--rule)", background: "transparent" }}>
            <option value="">Избери...</option>
            <option>под 3 000 лв.</option>
            <option>3 000 – 5 000 лв.</option>
            <option>5 000 – 8 000 лв.</option>
            <option>над 8 000 лв.</option>
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

function Summary({ t, data, lang, dressRefs, setDressRefs }) {
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
  const fmtDate = (d) => d ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}` : null;
  const [refInput, setRefInput] = useState("");
  const inputRef = useRef(null);

  const addRef = () => {
    const val = refInput.trim().replace(/\D/g, "");
    if (val && !dressRefs.includes(val)) {
      setDressRefs([...dressRefs, val]);
    }
    setRefInput("");
    inputRef.current?.focus();
  };

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

      <div className="summary-refs-section">
        <div className="summary-refs-label">
          {lang === "bg" ? "Рокли за пробване" : "Styles to try"}
        </div>
        {dressRefs.length > 0 && (
          <div className="summary-refs-pills">
            {dressRefs.map(ref => (
              <span key={ref} className="summary-ref-pill">
                Реф. {ref}
                <button
                  className="summary-ref-remove"
                  onClick={() => setDressRefs(dressRefs.filter(r => r !== ref))}
                  aria-label="Премахни"
                >×</button>
              </span>
            ))}
          </div>
        )}
        <div className="summary-ref-input-row">
          <input
            ref={inputRef}
            className="summary-ref-input"
            value={refInput}
            onChange={e => setRefInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addRef()}
            placeholder={lang === "bg" ? "Реф. номер…" : "Ref. number…"}
            maxLength={10}
          />
          <button className="summary-ref-add" onClick={addRef} disabled={!refInput.trim()}>
            +
          </button>
        </div>
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
        Резервацията е безплатна и може да бъде променяна до 24 часа преди срещата.
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
        <div className="s-row"><span className="label">{t.booking.summary_rows[2]}</span><span className="val">{data.date && data.date.toLocaleDateString("bg-BG")}</span></div>
        <div className="s-row"><span className="label">{t.booking.summary_rows[3]}</span><span className="val">{data.time}</span></div>
      </div>
      <button className="btn" style={{ marginTop: 36 }} onClick={() => setRoute("home")}>{t.booking.back_home} →</button>
    </div>
  );
}

function BookingPage({ lang, setRoute, dress = null }) {
  const t = i18n[lang];
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [done, setDone] = useState(false);
  const [dressRefs, setDressRefs] = useState(dress ? [String(dress.ref)] : []);

  const canNext = () => {
    if (step === 0) return data.type != null;
    if (step === 1) return data.location != null;
    if (step === 2) return data.date && data.time && data.timeConfirmed;
    if (step === 3) return data.name && data.email && data.phone;
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
          {step === 2 && <Step3Date t={t} data={data} setData={setData} />}
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
                  date: data.date ? data.date.toLocaleDateString("bg-BG") : "",
                  time: data.time || "",
                  dressRefs: dressRefs || [],
                  status: "new",
                };
                try {
                  const existing = JSON.parse(localStorage.getItem("areti_bookings") || "[]");
                  localStorage.setItem("areti_bookings", JSON.stringify([...existing, booking]));
                } catch {}
                setDone(true);
              }} disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }}>
                {t.booking.confirm}
              </button>
            )}
          </div>
        </div>
        <Summary t={t} data={data} lang={lang} dressRefs={dressRefs} setDressRefs={setDressRefs} />
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
