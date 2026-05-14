import { useState, useEffect } from 'react';
import { DRESSES, COLLECTIONS } from './data';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS = {
  get: (k, def = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DEFAULT_SETTINGS = {
  phone: "+359 2 987 65 43",
  email: "info@areti.bg",
  address: "бул. Витоша 112, София 1463",
  hours: {
    "Пон": { open: true,  from: "10:00", to: "19:00" },
    "Вт":  { open: true,  from: "10:00", to: "19:00" },
    "Ср":  { open: true,  from: "10:00", to: "19:00" },
    "Чет": { open: true,  from: "10:00", to: "19:00" },
    "Пет": { open: true,  from: "10:00", to: "19:00" },
    "Съб": { open: true,  from: "11:00", to: "17:00" },
    "Нед": { open: false, from: "11:00", to: "17:00" },
  },
  password: "areti2026",
};
const DAYS = ["Пон", "Вт", "Ср", "Чет", "Пет", "Съб", "Нед"];
const SL_BOOKING = { new: "Ново", confirmed: "Потвърдено", cancelled: "Отказано" };
const SL_INQUIRY = { new: "Ново", replied: "Отговорено", archived: "Архив" };
const SC = { new: "#c4a373", confirmed: "#5a9e6f", replied: "#5a9e6f", cancelled: "#c47373", archived: "#777" };

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
function AInput({ label, value, onChange, type="text", placeholder="", style={} }) {
  return (
    <div className="adm-field" style={style}>
      {label && <label className="adm-label">{label}</label>}
      <input className="adm-input" type={type} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} />
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

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pass, setPass] = useState(""); const [err, setErr] = useState(false);
  const tryLogin = () => {
    const s = LS.get("areti_settings", DEFAULT_SETTINGS);
    if (pass === (s.password || DEFAULT_SETTINGS.password)) { onLogin(); setErr(false); }
    else setErr(true);
  };
  return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div className="adm-login-logo">А</div>
        <h2 style={{ color:"#f0e8d8", fontSize:22, fontWeight:400, margin:"16px 0 4px", fontFamily:"var(--f-serif,serif)", fontStyle:"italic" }}>Арети</h2>
        <p style={{ color:"#888", fontSize:13, marginBottom:24 }}>Администраторски панел</p>
        <input className="adm-input" type="password" value={pass}
          onChange={e => { setPass(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          placeholder="Парола" autoFocus style={{ marginBottom:8 }} />
        {err && <p className="adm-err">Грешна парола</p>}
        <button className="adm-btn-solid" onClick={tryLogin} style={{ width:"100%", marginTop:8 }}>Вход →</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ bookings, inquiries, products, articles }) {
  const nb = bookings.filter(b => b.status === "new").length;
  const ni = inquiries.filter(i => i.status === "new").length;
  const stats = [
    { label:"Нови часове",      value:nb, sub:`от ${bookings.length} общо`,  color:"#c4a373" },
    { label:"Нови запитвания",  value:ni, sub:`от ${inquiries.length} общо`, color:"#a37ca0" },
    { label:"Продукти",         value:products.length, sub:"в каталога",     color:"#7ca3c4" },
    { label:"Статии",           value:articles.length, sub:"публикувани",    color:"#7cc48a" },
  ];
  const recent = [...bookings].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);
  return (
    <div className="adm-section">
      <h2 className="adm-section-title">Табло</h2>
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
                <tr key={b.id}>
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
function BookingsSection({ bookings, setBookings }) {
  const [filter, setFilter] = useState("all");
  const updStatus = (id, status) => {
    const u = bookings.map(b => b.id===id ? {...b,status} : b);
    setBookings(u); LS.set("areti_bookings", u);
  };
  const del = (id) => {
    if (!confirm("Изтрий тази резервация?")) return;
    const u = bookings.filter(b=>b.id!==id); setBookings(u); LS.set("areti_bookings",u);
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
              <div key={b.id} className="adm-card">
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
                    <button key={s} onClick={()=>updStatus(b.id,s)}
                      className={`adm-status-btn ${b.status===s?"active":""}`}
                      style={{ borderColor:SC[s], color:b.status===s?"#fff":SC[s], background:b.status===s?SC[s]:"transparent" }}>
                      {l}
                    </button>
                  ))}
                  <button className="adm-delete" onClick={()=>del(b.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Inquiries ────────────────────────────────────────────────────────────────
function InquiriesSection({ inquiries, setInquiries }) {
  const [filter, setFilter] = useState("all");
  const updStatus = (id, status) => {
    const u = inquiries.map(i=>i.id===id?{...i,status}:i);
    setInquiries(u); LS.set("areti_inquiries",u);
  };
  const del = (id) => {
    if (!confirm("Изтрий запитването?")) return;
    const u = inquiries.filter(i=>i.id!==id); setInquiries(u); LS.set("areti_inquiries",u);
  };
  const filtered = filter==="all" ? inquiries : inquiries.filter(i=>i.status===filter);
  const sorted = [...filtered].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <h2 className="adm-section-title">Запитвания <span className="adm-count">{inquiries.length}</span></h2>
        <div className="adm-filter-tabs">
          {[["all","Всички"],["new","Нови"],["replied","Отговорени"],["archived","Архив"]].map(([v,l])=>(
            <button key={v} className={`adm-filter-tab ${filter===v?"active":""}`} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      {sorted.length===0
        ? <p className="adm-empty">Няма запитвания в тази категория.</p>
        : <div className="adm-cards">
            {sorted.map(inq=>(
              <div key={inq.id} className="adm-card">
                <div className="adm-card-head">
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <strong style={{color:"#f0e8d8"}}>{inq.name}</strong>
                    <Badge status={inq.status} type="inquiry"/>
                  </div>
                  <div className="adm-card-date">{new Date(inq.createdAt).toLocaleDateString("bg-BG")}</div>
                </div>
                <div className="adm-card-body">
                  <div className="adm-info-grid">
                    <div><span className="adm-lbl">Email</span> <a href={`mailto:${inq.email}`} className="adm-link">{inq.email}</a></div>
                    <div><span className="adm-lbl">Тел.</span> <a href={`tel:${inq.phone}`} className="adm-link">{inq.phone}</a></div>
                  </div>
                  {inq.notes&&<p style={{marginTop:8,color:"#aaa",fontSize:14,fontStyle:"italic",lineHeight:1.5}}>„{inq.notes}"</p>}
                  {(inq.dressRefs||[]).length>0&&(
                    <div style={{marginTop:12}}>
                      <span className="adm-lbl">Рокли: </span>
                      {inq.dressRefs.map(r=><span key={r} className="adm-pill">Реф. {r}</span>)}
                    </div>
                  )}
                </div>
                <div className="adm-card-actions">
                  <span className="adm-lbl">Статус:</span>
                  {Object.entries(SL_INQUIRY).map(([s,l])=>(
                    <button key={s} onClick={()=>updStatus(inq.id,s)}
                      className={`adm-status-btn ${inq.status===s?"active":""}`}
                      style={{ borderColor:SC[s], color:inq.status===s?"#fff":SC[s], background:inq.status===s?SC[s]:"transparent" }}>
                      {l}
                    </button>
                  ))}
                  <button className="adm-delete" onClick={()=>del(inq.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = { ref:"", name_bg:"", name_en:"", collection:"cosmobella", silhouette:"А-силует", silhouette_en:"A-line", price:"", img:"", fabric:"", badge:"" };

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState(product ? {...product, price: String(product.price)} : EMPTY_PRODUCT);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const canSave = form.ref && form.name_bg && form.price;
  return (
    <div className="adm-form-overlay">
      <div className="adm-form-box">
        <h3 style={{color:"#f0e8d8",marginBottom:24}}>{product?"Редактирай продукт":"Нов продукт"}</h3>
        <div className="adm-form-grid">
          <AInput label="Реф. номер *" value={form.ref} onChange={v=>set("ref",v)} placeholder="8246"/>
          <AInput label="Цена (лв.) *" value={form.price} onChange={v=>set("price",v)} type="number" placeholder="4200"/>
          <AInput label="Наименование BG *" value={form.name_bg} onChange={v=>set("name_bg",v)} placeholder="Стил 8246"/>
          <AInput label="Наименование EN" value={form.name_en} onChange={v=>set("name_en",v)} placeholder="Style 8246"/>
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
              <option>А-силует</option><option>Бална</option><option>Сирена</option><option>Прав</option>
            </select>
          </div>
          <AInput label="Силует (EN)" value={form.silhouette_en} onChange={v=>set("silhouette_en",v)} placeholder="A-line"/>
          <div className="adm-field">
            <label className="adm-label">Badge</label>
            <select className="adm-input" value={form.badge||""} onChange={e=>set("badge",e.target.value)}>
              <option value="">—</option><option>New</option><option>Platinum</option><option>Couture</option>
            </select>
          </div>
        </div>
        <AInput label="Плат / Материал" value={form.fabric} onChange={v=>set("fabric",v)} placeholder="Дантела, тюл"/>
        <AInput label="URL на снимката" value={form.img} onChange={v=>set("img",v)} placeholder="https://images.unsplash.com/..."/>
        {form.img&&<img src={form.img} alt="" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:8,marginTop:8}}/>}
        <div className="adm-form-actions">
          <button className="adm-btn" onClick={onCancel}>Отказ</button>
          <button className="adm-btn-solid" disabled={!canSave} style={{opacity:canSave?1:0.4}}
            onClick={()=>canSave&&onSave({...form,price:Number(form.price)})}>
            {product?"Запази промените":"Добави продукт"} →
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsSection({ products, setProducts }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    p.name_bg.toLowerCase().includes(search.toLowerCase()) || p.ref.toLowerCase().includes(search.toLowerCase())
  );
  const saveProduct = (form) => {
    const isExisting = editing && editing !== "new" && products.some(p=>p.ref===editing.ref);
    const u = isExisting
      ? products.map(p=>p.ref===editing.ref?form:p)
      : (products.some(p=>p.ref===form.ref) ? products.map(p=>p.ref===form.ref?form:p) : [...products, form]);
    setProducts(u); LS.set("areti_products",u); setEditing(null);
  };
  const del = (ref) => {
    if (!confirm(`Изтрий Реф. ${ref}?`)) return;
    const u = products.filter(p=>p.ref!==ref); setProducts(u); LS.set("areti_products",u);
  };
  const reset = () => {
    if (!confirm("Нулирай до оригиналните продукти?")) return;
    localStorage.removeItem("areti_products"); setProducts(DRESSES);
  };
  return (
    <div className="adm-section">
      {editing!==null&&<ProductForm product={editing==="new"?null:editing} onSave={saveProduct} onCancel={()=>setEditing(null)}/>}
      <div className="adm-section-header" style={{flexWrap:"wrap",gap:12}}>
        <h2 className="adm-section-title" style={{margin:0}}>Продукти <span className="adm-count">{products.length}</span></h2>
        <input className="adm-input adm-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Търси реф. или наименование…"/>
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <button className="adm-btn" onClick={reset} title="Нулирай до оригинала">↺ Нулирай</button>
          <button className="adm-btn-solid" onClick={()=>setEditing("new")}>+ Нов продукт</button>
        </div>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Снимка</th><th>Реф.</th><th>Наименование</th><th>Колекция</th><th>Силует</th><th>Цена</th><th>Badge</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.ref}>
                <td><img src={p.img} alt={p.name_bg} style={{width:40,height:56,objectFit:"cover",borderRadius:4}}/></td>
                <td><code style={{color:"#c4a373",fontSize:12}}>{p.ref}</code></td>
                <td><strong style={{color:"#f0e8d8"}}>{p.name_bg}</strong><br/><small style={{color:"#666"}}>{p.name_en}</small></td>
                <td style={{color:"#aaa",fontSize:13}}>{COLLECTIONS.find(c=>c.id===p.collection)?.label||p.collection}</td>
                <td style={{color:"#aaa",fontSize:13}}>{p.silhouette}</td>
                <td style={{color:"#c4a373"}}>{Number(p.price).toLocaleString("bg-BG")} лв.</td>
                <td>{p.badge?<span className="adm-pill" style={{background:"#c4a37322",color:"#c4a373"}}>{p.badge}</span>:<span style={{color:"#444"}}>—</span>}</td>
                <td>
                  <div style={{display:"flex",gap:6}}>
                    <button className="adm-btn" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setEditing(p)}>Редактирай</button>
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
const EMPTY_ARTICLE = { id:null, title_bg:"", title_en:"", excerpt_bg:"", excerpt_en:"", img:"", date:new Date().toISOString().slice(0,10), visible:true };

function ArticleForm({ article, onSave, onCancel }) {
  const [form, setForm] = useState(article||EMPTY_ARTICLE);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const canSave = form.title_bg;
  return (
    <div className="adm-form-overlay">
      <div className="adm-form-box">
        <h3 style={{color:"#f0e8d8",marginBottom:24}}>{article?"Редактирай статия":"Нова статия"}</h3>
        <div className="adm-form-grid">
          <AInput label="Заглавие (BG) *" value={form.title_bg} onChange={v=>set("title_bg",v)}/>
          <AInput label="Заглавие (EN)" value={form.title_en} onChange={v=>set("title_en",v)}/>
        </div>
        <ATextarea label="Резюме (BG)" value={form.excerpt_bg} onChange={v=>set("excerpt_bg",v)} rows={3}/>
        <ATextarea label="Резюме (EN)" value={form.excerpt_en} onChange={v=>set("excerpt_en",v)} rows={3}/>
        <div className="adm-form-grid">
          <AInput label="URL на снимката" value={form.img} onChange={v=>set("img",v)} placeholder="https://..."/>
          <AInput label="Дата" value={form.date} onChange={v=>set("date",v)} type="date"/>
        </div>
        {form.img&&<img src={form.img} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,marginTop:8}}/>}
        <label className="adm-toggle-row" style={{marginTop:16}}>
          <input type="checkbox" checked={form.visible} onChange={e=>set("visible",e.target.checked)}/>
          <span style={{color:"#ccc",fontSize:14}}>Публикувана</span>
        </label>
        <div className="adm-form-actions">
          <button className="adm-btn" onClick={onCancel}>Отказ</button>
          <button className="adm-btn-solid" disabled={!canSave} style={{opacity:canSave?1:0.4}}
            onClick={()=>canSave&&onSave({...form,id:form.id||uid()})}>
            {article?"Запази промените":"Публикувай"} →
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticlesSection({ articles, setArticles }) {
  const [editing, setEditing] = useState(null);
  const save = (form) => {
    const u = articles.some(a=>a.id===form.id) ? articles.map(a=>a.id===form.id?form:a) : [...articles,form];
    setArticles(u); LS.set("areti_articles",u); setEditing(null);
  };
  const del = (id) => {
    if (!confirm("Изтрий статията?")) return;
    const u = articles.filter(a=>a.id!==id); setArticles(u); LS.set("areti_articles",u);
  };
  const sorted = [...articles].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div className="adm-section">
      {editing!==null&&<ArticleForm article={editing==="new"?null:editing} onSave={save} onCancel={()=>setEditing(null)}/>}
      <div className="adm-section-header">
        <h2 className="adm-section-title" style={{margin:0}}>Статии <span className="adm-count">{articles.length}</span></h2>
        <button className="adm-btn-solid" onClick={()=>setEditing("new")}>+ Нова статия</button>
      </div>
      {sorted.length===0
        ? <p className="adm-empty">Все още няма статии.</p>
        : <div className="adm-article-list">
            {sorted.map(a=>(
              <div key={a.id} className="adm-article-row">
                {a.img&&<img src={a.img} alt={a.title_bg} style={{width:80,height:60,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <strong style={{color:a.visible?"#f0e8d8":"#666"}}>{a.title_bg}</strong>
                  {a.title_en&&<span style={{color:"#555",fontSize:12,marginLeft:8}}>/ {a.title_en}</span>}
                  {!a.visible&&<span style={{color:"#555",fontSize:11,marginLeft:8}}>(скрита)</span>}
                  {a.excerpt_bg&&<p style={{fontSize:13,color:"#777",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.excerpt_bg}</p>}
                </div>
                <div style={{color:"#555",fontSize:12,flexShrink:0}}>{a.date}</div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button className="adm-btn" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setEditing(a)}>Редактирай</button>
                  <button className="adm-delete" onClick={()=>del(a.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection({ onLogout }) {
  const [s, setS] = useState(()=>LS.get("areti_settings",DEFAULT_SETTINGS));
  const [saved, setSaved] = useState(false);
  const [newPass, setNewPass] = useState(""); const [passErr, setPassErr] = useState("");
  const set = (k,v) => setS(prev=>({...prev,[k]:v}));
  const setH = (day,field,val) => setS(prev=>({...prev,hours:{...prev.hours,[day]:{...prev.hours?.[day],open:prev.hours?.[day]?.open??false,from:prev.hours?.[day]?.from??"10:00",to:prev.hours?.[day]?.to??"19:00",[field]:val}}}));
  const save = () => { LS.set("areti_settings",s); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  const changePass = () => {
    if (newPass.length<6) { setPassErr("Мин. 6 символа"); return; }
    const u = {...s,password:newPass}; setS(u); LS.set("areti_settings",u);
    setNewPass(""); setPassErr(""); alert("Паролата е сменена!");
  };
  return (
    <div className="adm-section">
      <h2 className="adm-section-title">Настройки</h2>
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
      <div className="adm-settings-block">
        <h3 className="adm-subtitle">Смяна на парола</h3>
        <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
          <AInput label="Нова парола (мин. 6 символа)" value={newPass} onChange={v=>{setNewPass(v);setPassErr("");}} type="password" placeholder="••••••••" style={{flex:1}}/>
          <button className="adm-btn-solid" onClick={changePass} style={{flexShrink:0,marginBottom:1}}>Смени</button>
        </div>
        {passErr&&<p className="adm-err">{passErr}</p>}
      </div>
      <div style={{display:"flex",gap:12,marginTop:32,alignItems:"center"}}>
        <button className="adm-btn-solid" onClick={save}>{saved?"✓ Запазено!":"Запази настройките →"}</button>
        <button className="adm-btn" onClick={onLogout} style={{color:"#c47373",borderColor:"#c4737344"}}>Изход от панела</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPanel({ setRoute: appSetRoute }) {
  const [authed, setAuthed] = useState(()=>LS.get("areti_admin_auth",false));
  const [section, setSection] = useState("dashboard");
  const [bookings, setBookings]   = useState(()=>LS.get("areti_bookings",[]));
  const [inquiries, setInquiries] = useState(()=>LS.get("areti_inquiries",[]));
  const [products, setProducts]   = useState(()=>LS.get("areti_products",null)||DRESSES);
  const [articles, setArticles]   = useState(()=>LS.get("areti_articles",[]));
  const [mobileNav, setMobileNav] = useState(false);

  const login  = () => { LS.set("areti_admin_auth",true);  setAuthed(true); };
  const logout = () => { LS.set("areti_admin_auth",false); setAuthed(false); appSetRoute("home"); };

  useEffect(() => {
    const tick = () => { setBookings(LS.get("areti_bookings",[])); setInquiries(LS.get("areti_inquiries",[])); };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  if (!authed) return <AdminLogin onLogin={login}/>;

  const nb = bookings.filter(b=>b.status==="new").length;
  const ni = inquiries.filter(i=>i.status==="new").length;
  const NAV = [
    { id:"dashboard", label:"Табло",        icon:"◈" },
    { id:"bookings",  label:"Часове",       icon:"◷", badge:nb },
    { id:"inquiries", label:"Запитвания",   icon:"✉", badge:ni },
    { id:"products",  label:"Продукти",     icon:"◻" },
    { id:"articles",  label:"Статии",       icon:"▤" },
    { id:"settings",  label:"Настройки",    icon:"◎" },
  ];
  const go = (id) => { setSection(id); setMobileNav(false); };

  return (
    <div className="adm-wrap">
      {/* Mobile hamburger */}
      <button className="adm-hamburger" onClick={()=>setMobileNav(v=>!v)} aria-label="Меню">
        <span/><span/><span/>
      </button>

      <aside className={`adm-sidebar ${mobileNav?"open":""}`}>
        <div className="adm-brand">
          <div className="adm-brand-logo">А</div>
          <div>
            <div className="adm-brand-name">Арети</div>
            <div className="adm-brand-sub">Администрация</div>
          </div>
        </div>
        <nav className="adm-nav">
          {NAV.map(n=>(
            <button key={n.id} className={`adm-nav-btn ${section===n.id?"active":""}`} onClick={()=>go(n.id)}>
              <span className="adm-nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.badge>0&&<span className="adm-nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <button className="adm-back" onClick={()=>appSetRoute("home")}>← Към сайта</button>
      </aside>

      {mobileNav&&<div className="adm-overlay" onClick={()=>setMobileNav(false)}/>}

      <main className="adm-main">
        {section==="dashboard"  && <Dashboard bookings={bookings} inquiries={inquiries} products={products} articles={articles}/>}
        {section==="bookings"   && <BookingsSection bookings={bookings} setBookings={setBookings}/>}
        {section==="inquiries"  && <InquiriesSection inquiries={inquiries} setInquiries={setInquiries}/>}
        {section==="products"   && <ProductsSection products={products} setProducts={setProducts}/>}
        {section==="articles"   && <ArticlesSection articles={articles} setArticles={setArticles}/>}
        {section==="settings"   && <SettingsSection onLogout={logout}/>}
      </main>
    </div>
  );
}
