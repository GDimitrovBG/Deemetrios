// Shared transactional email helper (Brevo / Sendinblue)

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const ARETI_EMAIL = process.env.ARETI_EMAIL || 'info@areti.bg';
const ARETI_NAME = 'Булчински салон Арети';

/** Parse ADMIN_EMAILS env var → array of emails. Falls back to ARETI_EMAIL. */
export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  const list = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (list.length) return list;
  return [ARETI_EMAIL.toLowerCase()];
}

export function emailConfigured() {
  return Boolean(BREVO_API_KEY);
}

export async function sendEmail({ to, toName, subject, html }) {
  if (!BREVO_API_KEY) {
    console.warn('[email] BREVO_API_KEY not configured — email skipped');
    return { ok: false, reason: 'not_configured' };
  }
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: ARETI_NAME, email: ARETI_EMAIL },
      to: [toName ? { email: to, name: toName } : { email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) return { ok: false, reason: 'provider_error', status: resp.status };
  return { ok: true };
}

/** Send one email to multiple recipients (BCC style — each gets individual email). */
export async function sendEmailToMany({ emails, subject, html }) {
  const results = [];
  for (const email of emails) {
    const r = await sendEmail({ to: email, subject, html });
    results.push({ email, ...r });
  }
  return results;
}

/** Escape user-supplied text before interpolating into email HTML. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Admin notification email for a newly created booking. */
export function bookingAdminEmail(b) {
  const row = (label, value) =>
    `<tr><td style="width:130px;font-weight:600;padding:2px 0;">${label}</td><td>${value}</td></tr>`;
  const dresses = Array.isArray(b.dressRefs) && b.dressRefs.length
    ? esc(b.dressRefs.join(', ')) : '—';
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#1a1612;">
      <h2 style="margin:0 0 16px;font-size:20px;">🗓 Нова заявка за консултация</h2>
      <table style="width:100%;font-size:14px;line-height:1.9;border-collapse:collapse;">
        ${row('Име', esc(b.name) || '—')}
        ${row('Имейл', b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : '—')}
        ${row('Телефон', b.phone ? `<a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>` : '—')}
        <tr><td colspan="2" style="border-top:1px solid #e8dfc9;height:8px;"></td></tr>
        ${row('Тип', esc(b.type) || '—')}
        ${row('Дата', esc(b.date) || '—')}
        ${row('Час', esc(b.time) || 'за уточняване')}
        ${row('Бюджет', esc(b.budget) || '—')}
        ${row('Рокли', dresses)}
        ${b.notes ? `<tr><td colspan="2" style="border-top:1px solid #e8dfc9;height:8px;"></td></tr>${row('Бележки', esc(b.notes))}` : ''}
      </table>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e8dfc9;font-size:12px;color:#8a7556;">
        Булчински салон Арети · автоматично известие при нова резервация
      </div>
    </div>
  `;
}

export function twoFactorCodeEmail({ name, code, expiresInMinutes = 10 }) {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1612;padding:32px;">
      <div style="border-bottom:1px solid #e8dfc9;padding-bottom:24px;margin-bottom:32px;">
        <h1 style="font-size:24px;font-weight:400;margin:0;letter-spacing:0.5px;">Булчински салон <em>Арети</em></h1>
      </div>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Здравейте${name ? ', ' + name : ''},
      </p>
      <p style="font-size:15px;line-height:1.6;color:#4a4540;margin:0 0 24px;">
        Кодът Ви за вход в администраторския панел е:
      </p>
      <div style="background:#f9f5ed;padding:24px;text-align:center;border-radius:4px;margin:0 0 24px;">
        <div style="font-family:'Courier New',monospace;font-size:36px;letter-spacing:8px;font-weight:700;color:#1a1612;">${code}</div>
      </div>
      <p style="font-size:13px;color:#8a7556;line-height:1.5;margin:0;">
        Кодът е валиден ${expiresInMinutes} минути. Ако не сте поискали този код, моля игнорирайте този имейл.
      </p>
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8dfc9;font-size:12px;color:#8a7556;">
        Булчински салон Арети · София
      </div>
    </div>
  `;
}
