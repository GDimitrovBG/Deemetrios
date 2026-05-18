// Shared transactional email helper (Brevo / Sendinblue)

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const ARETI_EMAIL = process.env.ARETI_EMAIL || 'info@areti.bg';
const ARETI_NAME = 'Арети — Bridal Couture';

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
      to: [{ email: to, name: toName || '' }],
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

export function twoFactorCodeEmail({ name, code, expiresInMinutes = 10 }) {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1612;padding:32px;">
      <div style="border-bottom:1px solid #e8dfc9;padding-bottom:24px;margin-bottom:32px;">
        <h1 style="font-size:24px;font-weight:400;margin:0;letter-spacing:0.5px;">Арети <em>Bridal</em></h1>
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
        Арети — Bridal Couture · София
      </div>
    </div>
  `;
}
