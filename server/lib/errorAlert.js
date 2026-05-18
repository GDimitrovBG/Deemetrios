// System error alerting — sends email to all admin emails when something crashes.
// Throttled: max 1 alert per error signature per 30 minutes to avoid spam.

import { sendEmailToMany, getAdminEmails, emailConfigured } from './email.js';

const THROTTLE_MS = 30 * 60 * 1000; // 30 minutes
const recentAlerts = new Map(); // signature → timestamp

function getSignature(err) {
  return `${err.name || 'Error'}:${err.message || ''}`.slice(0, 200);
}

function isThrottled(sig) {
  const last = recentAlerts.get(sig);
  if (last && Date.now() - last < THROTTLE_MS) return true;
  recentAlerts.set(sig, Date.now());
  // Clean old entries every so often
  if (recentAlerts.size > 100) {
    const cutoff = Date.now() - THROTTLE_MS;
    for (const [k, v] of recentAlerts) {
      if (v < cutoff) recentAlerts.delete(k);
    }
  }
  return false;
}

function alertHtml({ type, error, context, timestamp }) {
  const stack = error?.stack || 'No stack trace';
  const msg = error?.message || String(error);
  return `
    <div style="font-family:monospace;max-width:700px;margin:0 auto;color:#1a1612;padding:24px;">
      <div style="background:#c47373;color:white;padding:16px 20px;border-radius:4px 4px 0 0;">
        <h2 style="margin:0;font-size:18px;">⚠️ ${type}</h2>
      </div>
      <div style="background:#fff5f5;padding:20px;border:1px solid #e8c9c9;border-top:none;border-radius:0 0 4px 4px;">
        <table style="font-size:13px;line-height:1.8;border-collapse:collapse;width:100%;">
          <tr><td style="font-weight:700;width:100px;vertical-align:top;">Грешка</td><td>${escHtml(msg)}</td></tr>
          ${context ? `<tr><td style="font-weight:700;vertical-align:top;">Контекст</td><td>${escHtml(context)}</td></tr>` : ''}
          <tr><td style="font-weight:700;vertical-align:top;">Време</td><td>${timestamp}</td></tr>
        </table>
        <div style="margin-top:16px;padding:12px;background:#f9f0f0;border-radius:4px;overflow-x:auto;">
          <pre style="margin:0;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all;">${escHtml(stack)}</pre>
        </div>
      </div>
      <p style="font-size:11px;color:#888;margin-top:12px;">
        Арети Backend · Автоматичен alert · Следващ за тази грешка след 30 мин.
      </p>
    </div>
  `;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Send an error alert to all admin emails.
 * @param {string} type - Alert type, e.g. "Server Crash", "Unhandled Rejection", "500 Error"
 * @param {Error} error - The error object
 * @param {string} [context] - Extra context, e.g. "POST /api/bookings"
 */
export async function sendErrorAlert(type, error, context) {
  try {
    if (!emailConfigured()) return;

    const sig = getSignature(error);
    if (isThrottled(sig)) {
      console.warn(`[alert] Throttled: ${sig}`);
      return;
    }

    const emails = getAdminEmails();
    const timestamp = new Date().toLocaleString('bg-BG', { timeZone: 'Europe/Sofia' });
    const subject = `⚠️ ${type}: ${(error.message || 'Unknown error').slice(0, 80)}`;
    const html = alertHtml({ type, error, context, timestamp });

    await sendEmailToMany({ emails, subject, html });
    console.log(`[alert] Sent "${type}" alert to ${emails.join(', ')}`);
  } catch (alertErr) {
    // Never let the alerting system itself crash the app
    console.error('[alert] Failed to send error alert:', alertErr.message);
  }
}
