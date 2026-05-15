import { useState, useEffect, useRef, useCallback } from 'react';
import { DRESSES, COLLECTIONS } from './data';
import { BLOG_POSTS } from './blog_data';
import * as api from './api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DAYS = ["Пон", "Вт", "Ср", "Чет", "Пет", "Съб", "Нед"];
const SL_BOOKING = { new: "Ново", confirmed: "Потвърдено", cancelled: "Отказано" };
const SL_INQUIRY = { new: "Ново", replied: "Отговорено", archived: "Архив" };
const SC = { new: "#c4a373", confirmed: "#5a9e6f", replied: "#5a9e6f", cancelled: "#c47373", archived: "#777" };
const ROLE_LABELS = { admin: "Администратор", editor: "Редактор" };
const ROLE_COLORS = { admin: "#c4a373", editor: "#7ca3c4" };

// ─── Tiny shared components ────────────────────────────────────────────────────
function Badge({ status, type = "booking" }) {
  const label = (type === "booking" ? SL_BOOKING : SL_INQUIRY)[status] || status;
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11,
      letterSpacing:"0.07em", background: SC[status]+"22", color: SC[status],
      border:`1px solid ${SC[status]}44`, fontFamily:"var(--f-sans,sans-serif)" }}>
      {label}
    </span>
  );
}
function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || "#888";
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11,
      letterSpacing:"0.07em", background: c+"22", color: c,
      border:`1px solid ${c}44`, fontFamily:"var(--f-sans,sans-serif)" }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
function AInput({ label, value, onChange, type="text", placeholder="", style={}, disabled=false }) {
  return (
    <div className="adm-field" style={style}>
      {label && <label className="adm-label">{label}</label>}
      <input className="adm-input" type={type} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}
function ATextarea({ label, value, onChange, rows=3, placeholder="" }) {
  return (
    <div className="adm-field">
      {label && <label className="adm-label">{label}</label>}
      <textarea className="adm-input" rows={rows} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ resize:"vertical" }} />
    </div>
  );
}

// ─── Image compress helper ────────────────────────────────────────────────────
function compressImage(file, maxW = 1400) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── ImageUpload ──────────────────────────────────────────────────────────────
function ImageUpload({ label = "Снимка", value, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const result = await compressImage(file);
    if (result) onChange(result);
  }, [onChange]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const isBase64 = value && value.startsWith('data:');
  const urlVal   = value && !isBase64 ? value : '';

  return (
    <div className="adm-img-upload">
      <div className="adm-label" style={{ marginBottom: 6 }}>{label}</div>
      <div
        className={`adm-img-drop${drag ? ' drag' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {value
          ? <>
              <img src={value} alt="" />
              <div className="adm-img-drop-change">↑ Замени снимката</div>
            </>
          : <div className="adm-img-drop-label">
              <strong>Кликни или пусни снимка тук</strong>
              JPEG · PNG · WebP · max ~5 MB
            </div>
        }
        <input
          ref={inputRef} type="file" accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>
      <div className="adm-img-url-row">
        <span className="adm-img-url-label">или URL:</span>
        <input
          className="adm-input" style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
          value={urlVal} placeholder="https://cdn.example.com/photo.jpg"
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── RichEditor (WYSIWYG) ─────────────────────────────────────────────────────
const RICH_TOOLS = [
  { icon: 'B',   title: 'Удебелен',  cmd: 'bold',            style: { fontWeight: 'bold' } },
  { icon: 'I',   title: 'Курсив',    cmd: 'italic',          style: { fontStyle: 'italic' } },
  { icon: 'sep' },
  { icon: 'H2',  title: 'Заглавие 2', cmd: 'formatBlock', arg: 'h2', style: { fontSize: 11 } },
  { icon: 'H3',  title: 'Заглавие 3', cmd: 'formatBlock', arg: 'h3', style: { fontSize: 11 } },
  { icon: '¶',   title: 'Параграф',   cmd: 'formatBlock', arg: 'p'  },
  { icon: 'sep' },
  { icon: '≡',   title: 'Списък',     cmd: 'insertUnorderedList' },
  { icon: '①',   title: 'Нумериран', cmd: 'insertOrderedList'   },
  { icon: '❝',   title: 'Цитат',     cmd: 'formatBlock', arg: 'blockquote' },
  { icon: 'sep' },
  { icon: '🔗',  title: 'Линк',      cmd: '_link' },
  { icon: '✕',   title: 'Изчисти',   cmd: 'removeFormat' },
];

function RichEditor({ label, value = '', onChange, placeholder = 'Въведи текст…', minH = 200 }) {
  const ref = useRef(null);
  const skipUpdate = useRef(false);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd, arg) => {
    if (cmd === '_link') {
      const url = prompt('URL:');
      if (url) { ref.current.focus(); document.execCommand('createLink', false, url); }
      return;
    }
    ref.current.focus();
    document.execCommand(cmd, false, arg ?? null);
    skipUpdate.current = true;
    onChange(ref.current.innerHTML);
  };

  const onInput = () => {
    if (skipUpdate.current) { skipUpdate.current = false; return; }
    onChange(ref.current.innerHTML);
  };

  return (
    <div className="adm-rich-editor">
      {label && <div className="adm-rich-label">{label}</div>}
      <div className="adm-rich-wrap">
        <div className="adm-rich-toolbar">
          {RICH_TOOLS.map((t, i) =>
            t.icon === 'sep'
              ? <div key={i} className="adm-rich-sep" />
              : <button
                  key={i} type="button"
                  className="adm-rich-btn"
                  title={t.title}
                  style={t.style || {}}
                  onMouseDown={e => { e.preventDefault(); exec(t.cmd, t.arg); }}
                >
                  {t.icon}
                </button>
          )}
        </div>
        <div
          ref={ref}
          className="adm-rich-content"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          style={{ minHeight: minH }}
          onInput={onInput}
        />
      </div>
    </div>
  );
}

// ─── Gallery (multi-image manager) ────────────────────────────────────────────
function Gallery({ images = [], onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const addFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = await compressImage(file);
    if (url) onChange([...images, url]);
  };
  const addUrl = (url) => { if (url) onChange([...images, url]); };
  const removeAt = (i) => onChange(images.filter((_, k) => k !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const u = [...images]; [u[i], u[j]] = [u[j], u[i]]; onChange(u);
  };

  return (
    <div className="adm-img-upload">
      <div className="adm-label" style={{ marginBottom: 6 }}>
        Галерия <span style={{ color: '#555' }}>({images.length})</span>
      </div>
      <div className="adm-gallery-grid">
        {images.map((src, i) => (
          <div key={i} className="adm-gallery-item">
            <img src={src} alt={`#${i+1}`} />
            <div className="adm-gallery-overlay">
              <button type="button" className="adm-gallery-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Премести наляво">‹</button>
              <span className="adm-gallery-num">{i + 1}</span>
              <button type="button" className="adm-gallery-btn" onClick={() => move(i, +1)} disabled={i === images.length - 1} title="Премести надясно">›</button>
              <button type="button" className="adm-gallery-btn delete" onClick={() => removeAt(i)} title="Премахни">✕</button>
            </div>
            {i === 0 && <span className="adm-gallery-main">Основна</span>}
          </div>
        ))}
        <div
          className={`adm-gallery-item adm-gallery-add${drag ? ' drag' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); addFile(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize: 28, color: '#444', marginBottom: 4 }}>+</div>
          <div style={{ fontSize: 11, color: '#666' }}>Добави снимка</div>
          <input
            ref={inputRef} type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={e => { Array.from(e.target.files).forEach(addFile); e.target.value = ''; }}
          />
        </div>
      </div>
      <div className="adm-img-url-row">
        <span className="adm-img-url-label">или URL:</span>
        <input
          className="adm-input" style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
          placeholder="https://cdn.example.com/photo.jpg"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              addUrl(e.target.value.trim()); e.target.value = '';
            }
          }}
        />
        <span style={{ fontSize: 10, color: '#444' }}>↵ за добавяне</span>
      </div>
    </div>
  );
}

// ─── ProductSelector ────────────────────────────────────────────────────────
function ProductSelector({ products = [], selected = [], onChange, label = "Свързани продукти" }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    !selected.includes(p.ref) &&
    ((p.name_bg || '').toLowerCase().includes(search.toLowerCase()) ||
     p.ref.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);
  const selectedItems = selected.map(ref => products.find(p => p.ref === ref)).filter(Boolean);

  return (
    <div className="adm-img-upload">
      <div className="adm-label" style={{ marginBottom: 6 }}>{label} <span style={{ color: '#555' }}>({selected.length})</span></div>
      {selectedItems.length > 0 && (
        <div className="adm-chip-row">
          {selectedItems.map(p => (
            <span key={p.ref} className="adm-chip">
              <img src={p.img} alt="" />
              <span style={{ flex: 1 }}>{p.name_bg} <code style={{ color: '#888', fontSize: 10 }}>· {p.ref}</code></span>
              <button type="button" onClick={() => onChange(selected.filter(r => r !== p.ref))}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="adm-input" placeholder="Търси по реф. или име…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginTop: selectedItems.length ? 8 : 0 }}
      />
      {search && filtered.length > 0 && (
        <div className="adm-suggest-list">
          {filtered.map(p => (
            <div key={p.ref} className="adm-suggest-item" onClick={() => { onChange([...selected, p.ref]); setSearch(""); }}>
              <img src={p.img} alt="" />
              <div>
                <strong style={{ color: '#f0e8d8', fontSize: 13 }}>{p.name_bg}</strong>
                <div style={{ color: '#888', fontSize: 11 }}>Реф. {p.ref} · {COLLECTIONS.find(c=>c.id===p.collection)?.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = async () => {
    if (!email || !pass) { setErr("Въведете email и парола"); return; }
    setLoading(true); setErr("");
    try {
      const { token, user } = await api.login(email, pass);
      api.setToken(token);
      onLogin(user);
    } catch (e) {
      setErr(e.message || "Грешка при вход");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div className="adm-login-logo">А</div>
        <h2 style={{ color:"#f0e8d8", fontSize:22, fontWeight:400, margin:"16px 0 4px", fontFamily:"var(--f-serif,serif)", fontStyle:"italic" }}>Арети</h2>
        <p style={{ color:"#888", fontSize:13, marginBottom:24 }}>Администраторски панел</p>
        <input className="adm-input" type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          placeholder="Email" autoFocus style={{ marginBottom:8 }} />
        <input className="adm-input" type="password" value={pass}
          onChange={e => { setPass(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          placeholder="Парола" style={{ marginBottom:8 }} />
        {err && <p className="adm-err">{err}</p>}
        <button className="adm-btn-solid" onClick={tryLogin} disabled={loading}
          style={{ width:"100%", marginTop:8, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Влизане…" : "Вход →"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ bookings, products, articles, user }) {
  const nb = bookings.filter(b => b.status === "new").length;
  const stats = [
    { label:"Нови часове",      value:nb, sub:`от ${bookings.length} общо`,  color:"#c4a373" },
    { label:"Продукти",         value:products.length, sub:"в каталога",     color:"#7ca3c4" },
    { label:"Статии",           value:articles.length, sub:"публикувани",    color:"#7cc48a" },
  ];
  const recent = [...bookings].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);
  return (
    <div className="adm-section">
      <h2 className="adm-section-title">Табло</h2>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Здравей, <strong style={{ color: '#f0e8d8' }}>{user.name}</strong> <RoleBadge role={user.role} />
      </div>
      <div className="adm-stats-grid">
        {stats.map((s,i) => (
          <div key={i} className="adm-stat-card">
            <div className="adm-stat-value" style={{ color:s.color }}>{s.value}</div>
            <div className="adm-stat-label">{s.label}</div>
            <div className="adm-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <h3 className="adm-subtitle" style={{ marginTop:40 }}>Последни резервации</h3>
      {recent.length === 0
        ? <p className="adm-empty">Все още няма резервации.</p>
        : <div className="adm-table-wrap"><table className="adm-table">
            <thead><tr><th>Клиент</th><th>Дата/Час</th><th>Тип</th><th>Рокли</th><th>Статус</th></tr></thead>
            <tbody>
              {recent.map(b=>(
                <tr key={b._id}>
                  <td><strong>{b.name}</strong><br/><small style={{color:"#888"}}>{b.email}</small></td>
                  <td>{b.date} {b.time}</td>
                  <td style={{color:"#bbb"}}>{b.type}</td>
                  <td>{(b.dressRefs||[]).map(r=><span key={r} className="adm-pill">#{r}</span>)}</td>
                  <td><Badge status={b.status}/></td>
                </tr>
              ))}
            </tbody>
          </table></div>
      }
    </div>
  );
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
function BookingsSection({ bookings, reload }) {
  const [filter, setFilter] = useState("all");
  const updStatus = async (id, status) => {
    try { await api.updateBooking(id, { status }); reload(); } catch {}
  };
  const del = async (id) => {
    if (!confirm("Изтрий тази резервация?")) return;
    try { await api.deleteBooking(id); reload(); } catch {}
  };
  const filtered = filter==="all" ? bookings : bookings.filter(b=>b.status===filter);
  const sorted = [...filtered].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <h2 className="adm-section-title">Запазени часове <span className="adm-count">{bookings.length}</span></h2>
        <div className="adm-filter-tabs">
          {[["all","Всички"],["new","Нови"],["confirmed","Потвърдени"],["cancelled","Отказани"]].map(([v,l])=>(
            <button key={v} className={`adm-filter-tab ${filter===v?"active":""}`} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      {sorted.length===0
        ? <p className="adm-empty">Няма резервации в тази категория.</p>
        : <div className="adm-cards">
            {sorted.map(b=>(
              <div key={b._id} className="adm-card">
                <div className="adm-card-head">
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <strong style={{color:"#f0e8d8"}}>{b.name}</strong>
                    <Badge status={b.status}/>
                  </div>
                  <div className="adm-card-date">{new Date(b.createdAt).toLocaleDateString("bg-BG")}</div>
                </div>
                <div className="adm-card-body">
                  <div className="adm-info-grid">
                    <div><span className="adm-lbl">Email</span> <a href={`mailto:${b.email}`} className="adm-link">{b.email}</a></div>
                    <div><span className="adm-lbl">Тел.</span> <a href={`tel:${b.phone}`} className="adm-link">{b.phone}</a></div>
                    <div><span className="adm-lbl">Тип</span> {b.type}</div>
                    <div><span className="adm-lbl">Локация</span> {b.location}</div>
                    <div><span className="adm-lbl">Дата</span> {b.date}</div>
                    <div><span className="adm-lbl">Час</span> {b.time}</div>
                  </div>
                  {b.budget && <div style={{marginTop:8}}><span className="adm-lbl">Бюджет:</span> {b.budget}</div>}
                  {b.notes && <p style={{marginTop:8,color:"#aaa",fontSize:14,fontStyle:"italic",lineHeight:1.5}}>„{b.notes}"</p>}
                  {(b.dressRefs||[]).length>0&&(
                    <div style={{marginTop:12}}>
                      <span className="adm-lbl">Рокли за пробване: </span>
                      {b.dressRefs.map(r=><span key={r} className="adm-pill">Реф. {r}</span>)}
                    </div>
                  )}
                </div>
                <div className="adm-card-actions">
                  <span className="adm-lbl">Статус:</span>
                  {Object.entries(SL_BOOKING).map(([s,l])=>(
                    <button key={s} onClick={()=>updStatus(b._id,s)}
                      className={`adm-status-btn ${b.status===s?"active":""}`}
                      style={{ borderColor:SC[s], color:b.status===s?"#fff":SC[s], background:b.status===s?SC[s]:"transparent" }}>
                      {l}
                    </button>
                  ))}
                  <button className="adm-delete" onClick={()=>del(b._id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = { ref:"", name_bg:"", name_en:"", collection:"cosmobella", silhouette:"А-силует", silhouette_en:"A-line", price:"", img:"", imgs:[], fabric:"", badge:"", description_bg:"", description_en:"", seo_title_bg:"", seo_description_bg:"" };

function ProductEditPage({ product, onSave, onBack, isNew }) {
  const [form, setForm] = useState(() => {
    const base = product ? { ...product, price: String(product.price ?? 0) } : EMPTY_PRODUCT;
    if (!base.imgs || !Array.isArray(base.imgs)) base.imgs = base.img ? [base.img] : [];
    if (!base.imgs.length && base.img) base.imgs = [base.img];
    return base;
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.ref && form.name_bg;

  const setImgs = (imgs) => setForm(f => ({ ...f, imgs, img: imgs[0] || f.img }));

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const data = { ...form, price: Number(form.price) || 0, img: form.imgs?.[0] || form.img };
      delete data._id; delete data.__v; delete data.createdAt; delete data.updatedAt;
      if (isNew) await api.createProduct(data);
      else await api.updateProduct(product.ref, data);
      onSave();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-edit-bar">
        <button className="adm-btn" onClick={onBack}>← Назад</button>
        <div style={{ flex: 1 }}>
          <h2 className="adm-section-title" style={{ margin: 0 }}>
            {isNew ? "Нов продукт" : `Редактиране: ${product?.name_bg || product?.ref}`}
          </h2>
        </div>
        <button className="adm-btn-solid" disabled={!canSave || saving} style={{ opacity: canSave && !saving ? 1 : 0.4 }} onClick={handleSave}>
          {saving ? "Запазване…" : isNew ? "Публикувай" : "Запази промените"} →
        </button>
      </div>

      <div className="adm-edit-grid">
        <div className="adm-edit-main">
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Основни</h3>
            <div className="adm-form-grid">
              <AInput label="Реф. номер *" value={form.ref} onChange={v=>set("ref",v)} placeholder="8246" disabled={!isNew} />
              <AInput label="Цена (лв.)"   value={form.price} onChange={v=>set("price",v)} type="number" placeholder="4200" />
              <AInput label="Наименование BG *" value={form.name_bg} onChange={v=>set("name_bg",v)} placeholder="Style 8246" />
              <AInput label="Наименование EN"   value={form.name_en} onChange={v=>set("name_en",v)} placeholder="Style 8246" />
            </div>
            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-label">Колекция</label>
                <select className="adm-input" value={form.collection} onChange={e=>set("collection",e.target.value)}>
                  <option value="cosmobella">Cosmobella</option>
                  <option value="demetrios">Demetrios</option>
                  <option value="platinum">Demetrios Platinum</option>
                  <option value="destination">Destination Romance</option>
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Силует (BG)</label>
                <select className="adm-input" value={form.silhouette} onChange={e=>set("silhouette",e.target.value)}>
                  <option>А-силует</option><option>Принцеса</option><option>Бална</option>
                  <option>Сирена</option><option>Русалка</option><option>Прав</option>
                </select>
              </div>
              <AInput label="Силует (EN)" value={form.silhouette_en} onChange={v=>set("silhouette_en",v)} placeholder="A-line" />
              <div className="adm-field">
                <label className="adm-label">Badge</label>
                <select className="adm-input" value={form.badge||""} onChange={e=>set("badge",e.target.value)}>
                  <option value="">—</option><option>New</option><option>Platinum</option><option>Couture</option>
                </select>
              </div>
            </div>
            <AInput label="Плат / Материал" value={form.fabric} onChange={v=>set("fabric",v)} placeholder="Дантела, тюл" />
          </div>

          <div className="adm-card-block">
            <h3 className="adm-subtitle">Галерия</h3>
            <Gallery images={form.imgs || []} onChange={setImgs} />
          </div>

          <div className="adm-card-block">
            <h3 className="adm-subtitle">Описание</h3>
            <RichEditor label="Описание (BG)" value={form.description_bg || form.description || ""} onChange={v=>set("description_bg",v)} placeholder="Подробно описание на роклята…" minH={160} />
            <RichEditor label="Description (EN)" value={form.description_en || ""} onChange={v=>set("description_en",v)} placeholder="Detailed description in English…" minH={140} />
          </div>
        </div>

        <aside className="adm-edit-aside">
          <div className="adm-card-block">
            <h3 className="adm-subtitle">SEO</h3>
            <AInput label="SEO заглавие (BG)" value={form.seo_title_bg || ""} onChange={v=>set("seo_title_bg",v)} placeholder={`Булчинска рокля ${form.ref || '8246'} — ${form.silhouette}`} />
            <ATextarea label="SEO описание (BG · max 160 знака)" value={form.seo_description_bg || ""} onChange={v=>set("seo_description_bg",v.slice(0,160))} rows={3} placeholder="Кратко описание за Google резултати…" />
            <div style={{ fontSize: 10, color: '#555', textAlign: 'right' }}>{(form.seo_description_bg||"").length}/160</div>
            <hr style={{ border: 0, borderTop: '1px solid #2a2620', margin: '16px 0' }} />
            <AInput label="SEO Title (EN)" value={form.seo_title_en || ""} onChange={v=>set("seo_title_en",v)} placeholder={`Wedding Dress ${form.ref || '8246'}`} />
            <ATextarea label="Meta description (EN · max 160)" value={form.seo_description_en || ""} onChange={v=>set("seo_description_en",v.slice(0,160))} rows={3} />
          </div>
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Преглед в Google</h3>
            <div className="adm-google-preview">
              <div className="g-url">demetriosbride-bg.com › product › {form.ref || '—'}</div>
              <div className="g-title">{form.seo_title_bg || `Булчинска рокля ${form.ref} — ${form.silhouette} | Арети София`}</div>
              <div className="g-desc">{form.seo_description_bg || `Булчинска рокля Style ${form.ref || '—'} от колекция ${form.collection} — ${form.silhouette?.toLowerCase()} силует.`}</div>
            </div>
          </div>
        </aside>
      </div>

      <div className="adm-edit-footbar">
        <button className="adm-btn" onClick={onBack}>Отказ</button>
        <button className="adm-btn-solid" disabled={!canSave || saving} style={{ opacity: canSave && !saving ? 1 : 0.4 }} onClick={handleSave}>
          {saving ? "Запазване…" : isNew ? "Публикувай" : "Запази"} →
        </button>
      </div>
    </div>
  );
}

function ProductsSection({ products, reload, onEdit, onNew }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    (p.name_bg || '').toLowerCase().includes(search.toLowerCase()) || p.ref.toLowerCase().includes(search.toLowerCase())
  );
  const del = async (ref) => {
    if (!confirm(`Изтрий Реф. ${ref}?`)) return;
    try { await api.deleteProduct(ref); reload(); } catch {}
  };
  return (
    <div className="adm-section">
      <div className="adm-section-header" style={{flexWrap:"wrap",gap:12}}>
        <h2 className="adm-section-title" style={{margin:0}}>Продукти <span className="adm-count">{products.length}</span></h2>
        <input className="adm-input adm-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Търси реф. или наименование…"/>
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <button className="adm-btn-solid" onClick={onNew}>+ Нов продукт</button>
        </div>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Снимка</th><th>Реф.</th><th>Наименование</th><th>Колекция</th><th>Силует</th><th>Цена</th><th>Badge</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.ref} style={{ cursor:'pointer' }} onClick={()=>onEdit(p)}>
                <td><img src={p.img} alt={p.name_bg} style={{width:40,height:56,objectFit:"cover",borderRadius:4}}/></td>
                <td><code style={{color:"#c4a373",fontSize:12}}>{p.ref}</code></td>
                <td><strong style={{color:"#f0e8d8"}}>{p.name_bg}</strong><br/><small style={{color:"#666"}}>{p.name_en}</small></td>
                <td style={{color:"#aaa",fontSize:13}}>{COLLECTIONS.find(c=>c.id===p.collection)?.label||p.collection}</td>
                <td style={{color:"#aaa",fontSize:13}}>{p.silhouette}</td>
                <td style={{color:"#c4a373"}}>{Number(p.price).toLocaleString("bg-BG")} лв.</td>
                <td>{p.badge?<span className="adm-pill" style={{background:"#c4a37322",color:"#c4a373"}}>{p.badge}</span>:<span style={{color:"#444"}}>—</span>}</td>
                <td onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:6}}>
                    <button className="adm-btn" style={{padding:"4px 10px",fontSize:11}} onClick={()=>onEdit(p)}>Редактирай</button>
                    <button className="adm-delete" onClick={()=>del(p.ref)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Articles ─────────────────────────────────────────────────────────────────
function ArticleEditPage({ article, allProducts, onSave, onBack, isNew }) {
  const [form, setForm] = useState(() => {
    const base = article ? { ...article } : { title_bg:"", title_en:"", excerpt_bg:"", excerpt_en:"", content:"", img:"", date:new Date().toISOString().slice(0,10), visible:true, category:"Блог", relatedRefs:[], seo_title:"", seo_description:"" };
    if (!base.relatedRefs) base.relatedRefs = [];
    return base;
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.title_bg;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const data = { ...form };
      delete data._id; delete data.__v; delete data.createdAt; delete data.updatedAt; delete data.author;
      if (isNew) await api.createArticle(data);
      else await api.updateArticle(article._id, data);
      onSave();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-edit-bar">
        <button className="adm-btn" onClick={onBack}>← Назад</button>
        <div style={{ flex: 1 }}>
          <h2 className="adm-section-title" style={{ margin: 0 }}>
            {isNew ? "Нова статия" : `Редактиране: ${article?.title_bg || ''}`}
          </h2>
        </div>
        <label className="adm-toggle-row" style={{ marginRight: 12 }}>
          <input type="checkbox" checked={form.visible !== false} onChange={e=>set("visible",e.target.checked)} />
          <span style={{ color: '#ccc', fontSize: 13 }}>Публикувана</span>
        </label>
        <button className="adm-btn-solid" disabled={!canSave || saving} style={{ opacity: canSave && !saving ? 1 : 0.4 }} onClick={handleSave}>
          {saving ? "Запазване…" : isNew ? "Публикувай" : "Запази"} →
        </button>
      </div>

      <div className="adm-edit-grid">
        <div className="adm-edit-main">
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Основни</h3>
            <AInput label="Заглавие (BG) *" value={form.title_bg} onChange={v=>set("title_bg",v)} placeholder="Заглавие на статията…" />
            <AInput label="Заглавие (EN)"   value={form.title_en} onChange={v=>set("title_en",v)} />
            <div className="adm-form-grid">
              <AInput label="Дата" value={form.date} onChange={v=>set("date",v)} type="date" />
              <AInput label="Категория" value={form.category||""} onChange={v=>set("category",v)} placeholder="Булчински рокли" />
            </div>
            <ATextarea label="Резюме (BG)" value={form.excerpt_bg} onChange={v=>set("excerpt_bg",v)} rows={3} placeholder="Кратко резюме…" />
          </div>
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Заглавна снимка</h3>
            <ImageUpload label="" value={form.img} onChange={v=>set("img",v)} />
          </div>
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Съдържание</h3>
            <RichEditor label="" value={form.content || ""} onChange={v=>set("content",v)} placeholder="Напиши съдържанието на статията…" minH={400} />
          </div>
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Свързани продукти</h3>
            <ProductSelector products={allProducts} selected={form.relatedRefs || []} onChange={refs => set("relatedRefs", refs)} label="" />
          </div>
        </div>
        <aside className="adm-edit-aside">
          <div className="adm-card-block">
            <h3 className="adm-subtitle">SEO</h3>
            <AInput label="SEO заглавие" value={form.seo_title || ""} onChange={v=>set("seo_title",v)} placeholder={form.title_bg || "Заглавието по подразбиране"} />
            <ATextarea label="SEO описание (max 160)" value={form.seo_description || ""} onChange={v=>set("seo_description",v.slice(0,160))} rows={3} placeholder={form.excerpt_bg || "Резюмето по подразбиране"} />
            <div style={{ fontSize: 10, color: '#555', textAlign: 'right' }}>{(form.seo_description||"").length}/160</div>
          </div>
          <div className="adm-card-block">
            <h3 className="adm-subtitle">Преглед в Google</h3>
            <div className="adm-google-preview">
              <div className="g-url">demetriosbride-bg.com › blog › —</div>
              <div className="g-title">{form.seo_title || form.title_bg || '—'}</div>
              <div className="g-desc">{form.seo_description || form.excerpt_bg || '—'}</div>
            </div>
          </div>
        </aside>
      </div>

      <div className="adm-edit-footbar">
        <button className="adm-btn" onClick={onBack}>Отказ</button>
        <button className="adm-btn-solid" disabled={!canSave || saving} style={{ opacity: canSave && !saving ? 1 : 0.4 }} onClick={handleSave}>
          {saving ? "Запазване…" : isNew ? "Публикувай" : "Запази"} →
        </button>
      </div>
    </div>
  );
}

function ArticlesSection({ articles, reload, onEdit, onNew }) {
  const del = async (id) => {
    if (!confirm("Изтрий статията?")) return;
    try { await api.deleteArticle(id); reload(); } catch {}
  };
  const sorted = [...articles].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <h2 className="adm-section-title" style={{margin:0}}>Статии <span className="adm-count">{articles.length}</span></h2>
        <button className="adm-btn-solid" onClick={onNew}>+ Нова статия</button>
      </div>
      {sorted.length===0
        ? <p className="adm-empty">Все още няма статии.</p>
        : <div className="adm-article-list">
            {sorted.map(a=>(
              <div key={a._id} className="adm-article-row" style={{cursor:'pointer'}} onClick={()=>onEdit(a)}>
                {a.img&&<img src={a.img} alt={a.title_bg} style={{width:80,height:60,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <strong style={{color:a.visible?"#f0e8d8":"#666"}}>{a.title_bg}</strong>
                  {a.title_en&&<span style={{color:"#555",fontSize:12,marginLeft:8}}>/ {a.title_en}</span>}
                  {!a.visible&&<span style={{color:"#555",fontSize:11,marginLeft:8}}>(скрита)</span>}
                  {a.excerpt_bg&&<p style={{fontSize:13,color:"#777",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.excerpt_bg}</p>}
                </div>
                <div style={{color:"#555",fontSize:12,flexShrink:0}}>{a.date}</div>
                <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button className="adm-btn" style={{padding:"4px 10px",fontSize:11}} onClick={()=>onEdit(a)}>Редактирай</button>
                  <button className="adm-delete" onClick={()=>del(a._id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Users (Admin only) ──────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setUsers(await api.getUsers()); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'editor' });
    setErr('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setErr('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.email) { setErr('Име и email са задължителни'); return; }
    if (!editing && (!form.password || form.password.length < 6)) { setErr('Парола мин. 6 символа'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) {
        const data = { name: form.name, email: form.email, role: form.role };
        if (form.password && form.password.length >= 6) data.password = form.password;
        await api.updateUser(editing._id, data);
      } else {
        await api.createUser(form);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try { await api.updateUser(u._id, { active: !u.active }); load(); } catch {}
  };

  const del = async (u) => {
    if (!confirm(`Изтрий ${u.name}?`)) return;
    try { await api.deleteUser(u._id); load(); } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="adm-section"><p className="adm-empty">Зареждане…</p></div>;

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <h2 className="adm-section-title">Потребители <span className="adm-count">{users.length}</span></h2>
        <button className="adm-btn-solid" onClick={openNew}>+ Нов потребител</button>
      </div>

      {showForm && (
        <div className="adm-card" style={{ marginBottom: 24, borderColor: '#c4a37344' }}>
          <div className="adm-card-head">
            <strong style={{ color: '#f0e8d8' }}>{editing ? `Редактиране: ${editing.name}` : 'Нов потребител'}</strong>
            <button className="adm-delete" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="adm-card-body">
            <div className="adm-form-grid">
              <AInput label="Име *" value={form.name} onChange={v => set('name', v)} placeholder="Име Фамилия" />
              <AInput label="Email *" value={form.email} onChange={v => set('email', v)} type="email" placeholder="user@areti.bg" />
              <AInput label={editing ? "Нова парола (остави празно)" : "Парола *"} value={form.password} onChange={v => set('password', v)} type="password" placeholder="мин. 6 символа" />
              <div className="adm-field">
                <label className="adm-label">Роля</label>
                <select className="adm-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="admin">Администратор</option>
                  <option value="editor">Редактор</option>
                </select>
              </div>
            </div>
            {err && <p className="adm-err" style={{ marginTop: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="adm-btn-solid" onClick={save} disabled={saving}>
                {saving ? 'Запазване…' : editing ? 'Запази' : 'Създай'} →
              </button>
              <button className="adm-btn" onClick={() => setShowForm(false)}>Отказ</button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-cards">
        {users.map(u => (
          <div key={u._id} className="adm-card" style={{ opacity: u.active ? 1 : 0.5 }}>
            <div className="adm-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ color: '#f0e8d8' }}>{u.name}</strong>
                <RoleBadge role={u.role} />
                {!u.active && <span style={{ color: '#c47373', fontSize: 11 }}>деактивиран</span>}
              </div>
              <div className="adm-card-date">{new Date(u.createdAt).toLocaleDateString("bg-BG")}</div>
            </div>
            <div className="adm-card-body">
              <div><span className="adm-lbl">Email</span> <span className="adm-link">{u.email}</span></div>
            </div>
            <div className="adm-card-actions">
              <button className="adm-btn" style={{ fontSize: 11 }} onClick={() => openEdit(u)}>Редактирай</button>
              <button className="adm-btn" style={{ fontSize: 11, color: u.active ? '#c47373' : '#5a9e6f' }}
                onClick={() => toggleActive(u)}>
                {u.active ? 'Деактивирай' : 'Активирай'}
              </button>
              <button className="adm-delete" onClick={() => del(u)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection({ user, onLogout }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [curPass, setCurPass] = useState(""); const [newPass, setNewPass] = useState(""); const [passErr, setPassErr] = useState(""); const [passOk, setPassOk] = useState(false);

  useEffect(() => {
    api.getSettings().then(data => { setS(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (k,v) => setS(prev=>({...prev,[k]:v}));
  const setH = (day,field,val) => setS(prev=>({...prev,hours:{...prev.hours,[day]:{...prev.hours?.[day],open:prev.hours?.[day]?.open??false,from:prev.hours?.[day]?.from??"10:00",to:prev.hours?.[day]?.to??"19:00",[field]:val}}}));

  const save = async () => {
    try { await api.updateSettings(s); setSaved(true); setTimeout(()=>setSaved(false),2000); } catch (e) { alert(e.message); }
  };

  const changePass = async () => {
    if (!curPass) { setPassErr("Въведете текущата парола"); return; }
    if (newPass.length<6) { setPassErr("Мин. 6 символа"); return; }
    try {
      await api.changeMyPassword(curPass, newPass);
      setCurPass(""); setNewPass(""); setPassErr(""); setPassOk(true);
      setTimeout(() => setPassOk(false), 3000);
    } catch (e) {
      setPassErr(e.message);
    }
  };

  if (loading || !s) return <div className="adm-section"><p className="adm-empty">Зареждане…</p></div>;

  const isAdmin = user.role === 'admin';

  return (
    <div className="adm-section">
      <h2 className="adm-section-title">Настройки</h2>

      {isAdmin && (
        <>
          {/* ── SEO & Tracking ── */}
          <div className="adm-settings-block">
            <h3 className="adm-subtitle">🔍 SEO и проследяване</h3>
            <p style={{fontSize:12,color:"#888",marginBottom:16}}>Тук се настройват Google Analytics, Search Console, Facebook Pixel и sitemap. Промените влизат в сила веднага.</p>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Google Analytics</h4>
              <AInput label="Measurement ID" value={s.ga_id||""} onChange={v=>set("ga_id",v)} placeholder="G-XXXXXXXXXX" />
              <p className="adm-hint">Google Analytics 4 Measurement ID. Намира се в GA → Admin → Data Streams.</p>
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Google Search Console</h4>
              <AInput label="Мета таг за верификация" value={s.gsc_verification||""} onChange={v=>set("gsc_verification",v)} placeholder="google-site-verification=XXXXXXXXXXXX" />
              <p className="adm-hint">Само стойността от content="…" на verification мета тага.</p>
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Google Tag Manager</h4>
              <AInput label="GTM Container ID" value={s.gtm_id||""} onChange={v=>set("gtm_id",v)} placeholder="GTM-XXXXXXX" />
              <p className="adm-hint">Ако ползвате GTM, въведете контейнер ID. Не е нужно ако вече имате GA ID горе.</p>
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Facebook Pixel</h4>
              <AInput label="Pixel ID" value={s.fb_pixel||""} onChange={v=>set("fb_pixel",v)} placeholder="123456789012345" />
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Sitemap & Robots</h4>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:8}}>
                <label className="adm-toggle-row">
                  <input type="checkbox" checked={s.sitemap_enabled!==false} onChange={e=>set("sitemap_enabled",e.target.checked)} />
                  <span style={{fontSize:13}}>Автоматичен sitemap.xml</span>
                </label>
              </div>
              <p className="adm-hint">Генерира се автоматично от продуктите и статиите: <code>/api/sitemap.xml</code></p>
              <ATextarea label="robots.txt (допълнителни правила)" value={s.robots_extra||""} onChange={v=>set("robots_extra",v)} rows={3} placeholder="# Допълнителни правила&#10;Disallow: /admin" />
              <p className="adm-hint">Основният robots.txt е на: <code>/api/robots.txt</code> — автоматично включва Sitemap линк.</p>
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Допълнителни мета тагове</h4>
              <AInput label="Bing Webmaster" value={s.bing_verification||""} onChange={v=>set("bing_verification",v)} placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
              <AInput label="Yandex Webmaster" value={s.yandex_verification||""} onChange={v=>set("yandex_verification",v)} placeholder="XXXXXXXXXXXXXXXX" />
            </div>

            <div className="adm-seo-group">
              <h4 className="adm-seo-group-title">Open Graph по подразбиране</h4>
              <AInput label="OG Image URL" value={s.og_image||""} onChange={v=>set("og_image",v)} placeholder="https://demetriosbride-bg.com/images/og-default.jpg" />
              <AInput label="SEO заглавие на сайта" value={s.seo_title||""} onChange={v=>set("seo_title",v)} placeholder="Арети — Bridal Couture" />
              <ATextarea label="SEO описание на сайта" value={s.seo_description||""} onChange={v=>set("seo_description",v)} rows={2} placeholder="Луксозни булчински рокли в София..." />
            </div>
          </div>

          <div className="adm-settings-block">
            <h3 className="adm-subtitle">Контактна информация</h3>
            <div className="adm-form-grid">
              <AInput label="Телефон" value={s.phone||""} onChange={v=>set("phone",v)} placeholder="+359 2 987 65 43"/>
              <AInput label="Email" value={s.email||""} onChange={v=>set("email",v)} placeholder="info@areti.bg"/>
            </div>
            <AInput label="Адрес" value={s.address||""} onChange={v=>set("address",v)} placeholder="бул. Витоша 112, София"/>
          </div>
          <div className="adm-settings-block">
            <h3 className="adm-subtitle">Работно време</h3>
            <div className="adm-hours-grid">
              {DAYS.map(day=>{
                const h = s.hours?.[day]||{open:false,from:"10:00",to:"19:00"};
                return (
                  <div key={day} className="adm-hours-row">
                    <label className="adm-toggle-row" style={{width:72,flexShrink:0}}>
                      <input type="checkbox" checked={h.open} onChange={e=>setH(day,"open",e.target.checked)}/>
                      <span style={{color:h.open?"#f0e8d8":"#666",fontSize:13}}>{day}</span>
                    </label>
                    <input className="adm-input adm-time" type="time" value={h.from} disabled={!h.open} onChange={e=>setH(day,"from",e.target.value)}/>
                    <span style={{color:"#555"}}>—</span>
                    <input className="adm-input adm-time" type="time" value={h.to} disabled={!h.open} onChange={e=>setH(day,"to",e.target.value)}/>
                    {!h.open&&<span style={{color:"#555",fontSize:12}}>Почивен</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{marginBottom:32}}>
            <button className="adm-btn-solid" onClick={save}>{saved?"✓ Запазено!":"Запази настройките →"}</button>
          </div>
        </>
      )}

      <div className="adm-settings-block">
        <h3 className="adm-subtitle">Смяна на парола</h3>
        <div className="adm-form-grid">
          <AInput label="Текуща парола" value={curPass} onChange={v=>{setCurPass(v);setPassErr("");}} type="password" placeholder="••••••••" />
          <AInput label="Нова парола (мин. 6 символа)" value={newPass} onChange={v=>{setNewPass(v);setPassErr("");}} type="password" placeholder="••••••••" />
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center",marginTop:12}}>
          <button className="adm-btn-solid" onClick={changePass}>Смени паролата</button>
          {passOk && <span style={{ color: '#5a9e6f', fontSize: 13 }}>Паролата е сменена!</span>}
        </div>
        {passErr&&<p className="adm-err" style={{marginTop:8}}>{passErr}</p>}
      </div>

      <div style={{display:"flex",gap:12,marginTop:32,alignItems:"center"}}>
        <button className="adm-btn" onClick={onLogout} style={{color:"#c47373",borderColor:"#c4737344"}}>Изход от панела</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPanel({ setRoute: appSetRoute }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [bookings, setBookings]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [articles, setArticles]   = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);

  const loadData = async () => {
    try {
      const [b, p, a] = await Promise.all([
        api.getBookings().catch(() => []),
        api.getProducts().catch(() => []),
        api.getArticles(true).catch(() => []),
      ]);
      setBookings(b);
      setProducts(p);
      setArticles(a);
    } catch {}
  };

  useEffect(() => {
    const token = api.getToken();
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then(({ user: u }) => { setUser(u); loadData(); })
      .catch(() => { api.setToken(null); })
      .finally(() => setLoading(false));

    api.onUnauthenticated(() => { setUser(null); });
  }, []);

  const login = (u) => { setUser(u); loadData(); };
  const logout = () => { api.setToken(null); setUser(null); appSetRoute("home"); };

  useEffect(() => {
    if (!user) return;
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [user]);

  if (loading) return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div className="adm-login-logo">А</div>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>Зареждане…</p>
      </div>
    </div>
  );

  if (!user) return <AdminLogin onLogin={login}/>;

  const isAdmin = user.role === 'admin';
  const nb = bookings.filter(b=>b.status==="new").length;

  const NAV = [
    { id:"dashboard", label:"Табло",        icon:"◈" },
    { id:"bookings",  label:"Часове",       icon:"◷", badge:nb },
    { id:"products",  label:"Продукти",     icon:"◻" },
    { id:"articles",  label:"Статии",       icon:"▤" },
    ...(isAdmin ? [{ id:"users", label:"Потребители", icon:"◉" }] : []),
    { id:"settings",  label:"Настройки",    icon:"◎" },
  ];
  const go = (id) => { setSection(id); setMobileNav(false); };

  const goEditProduct = (p) => { setEditingProduct(p); setSection("product-edit"); window.scrollTo(0, 0); };
  const goNewProduct  = ()  => { setEditingProduct("new"); setSection("product-edit"); window.scrollTo(0, 0); };
  const afterProductSave = () => { setEditingProduct(null); setSection("products"); loadData(); };

  const goEditArticle = (a) => { setEditingArticle(a); setSection("article-edit"); window.scrollTo(0, 0); };
  const goNewArticle  = ()  => { setEditingArticle("new"); setSection("article-edit"); window.scrollTo(0, 0); };
  const afterArticleSave = () => { setEditingArticle(null); setSection("articles"); loadData(); };

  return (
    <div className="adm-wrap">
      <button className="adm-hamburger" onClick={()=>setMobileNav(v=>!v)} aria-label="Меню">
        <span/><span/><span/>
      </button>

      <aside className={`adm-sidebar ${mobileNav?"open":""}`}>
        <div className="adm-brand">
          <div className="adm-brand-logo">А</div>
          <div>
            <div className="adm-brand-name">Арети</div>
            <div className="adm-brand-sub">{user.name} · <span style={{ color: ROLE_COLORS[user.role] }}>{ROLE_LABELS[user.role]}</span></div>
          </div>
        </div>
        <nav className="adm-nav">
          {NAV.map(n=>{
            const isActive = section === n.id ||
              (n.id === "products" && section === "product-edit") ||
              (n.id === "articles" && section === "article-edit");
            return (
              <button key={n.id} className={`adm-nav-btn ${isActive?"active":""}`} onClick={()=>go(n.id)}>
                <span className="adm-nav-icon">{n.icon}</span>
                <span>{n.label}</span>
                {n.badge>0&&<span className="adm-nav-badge">{n.badge}</span>}
              </button>
            );
          })}
        </nav>
        <button className="adm-back" onClick={()=>appSetRoute("home")}>← Към сайта</button>
      </aside>

      {mobileNav&&<div className="adm-overlay" onClick={()=>setMobileNav(false)}/>}

      <main className="adm-main">
        {section==="dashboard"  && <Dashboard bookings={bookings} products={products} articles={articles} user={user}/>}
        {section==="bookings"   && <BookingsSection bookings={bookings} reload={loadData}/>}
        {section==="products"   && <ProductsSection products={products} reload={loadData} onEdit={goEditProduct} onNew={goNewProduct}/>}
        {section==="product-edit" && (
          <ProductEditPage
            product={editingProduct === "new" ? null : editingProduct}
            isNew={editingProduct === "new"}
            onSave={afterProductSave}
            onBack={() => { setEditingProduct(null); setSection("products"); }}
          />
        )}
        {section==="articles"   && <ArticlesSection articles={articles} reload={loadData} onEdit={goEditArticle} onNew={goNewArticle}/>}
        {section==="article-edit" && (
          <ArticleEditPage
            article={editingArticle === "new" ? null : editingArticle}
            isNew={editingArticle === "new"}
            allProducts={products}
            onSave={afterArticleSave}
            onBack={() => { setEditingArticle(null); setSection("articles"); }}
          />
        )}
        {section==="users" && isAdmin && <UsersSection />}
        {section==="settings"   && <SettingsSection user={user} onLogout={logout}/>}
      </main>
    </div>
  );
}
