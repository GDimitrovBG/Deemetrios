import { Router } from 'express';
import { sendEmail, sendEmailToMany, getAdminEmails, emailConfigured } from '../lib/email.js';
import { requireAuth } from '../middleware/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();

// Send booking notification to a single recipient (customer confirmation)
router.post('/send-booking', async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Email not configured' });
  const { to, toName, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to or subject' });

  // Only allow sending to known admin emails or to the customer (validated below)
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(to.toLowerCase().trim())) {
    // Allow sending to any email only via /send-customer endpoint
    return res.status(403).json({ error: 'Recipient not allowed — use /send-customer for client emails' });
  }

  if (subject.length > 200) return res.status(400).json({ error: 'Subject too long' });
  if (html && html.length > 50000) return res.status(400).json({ error: 'Body too long' });

  const result = await sendEmail({ to, toName, subject, html });
  if (!result.ok) return res.status(502).json({ error: 'Email provider error' });
  res.json({ ok: true });
});

// Send booking confirmation to customer (called from public booking form)
router.post('/send-customer', async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Email not configured' });
  const { to, toName, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to or subject' });
  // Validate recipient email format — prevents header injection / abuse
  if (!EMAIL_RE.test(String(to))) return res.status(400).json({ error: 'Invalid recipient email' });

  if (subject.length > 200) return res.status(400).json({ error: 'Subject too long' });
  if (html && html.length > 50000) return res.status(400).json({ error: 'Body too long' });

  const result = await sendEmail({ to, toName, subject, html });
  if (!result.ok) return res.status(502).json({ error: 'Email provider error' });
  res.json({ ok: true });
});

// Send notification to ALL admin emails — requires auth (prevents spam/phishing abuse)
router.post('/notify-admins', requireAuth, async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Email not configured' });
  const { subject, html } = req.body;
  if (!subject) return res.status(400).json({ error: 'Missing subject' });

  if (subject.length > 200) return res.status(400).json({ error: 'Subject too long' });
  if (html && html.length > 50000) return res.status(400).json({ error: 'Body too long' });

  const emails = getAdminEmails();
  const results = await sendEmailToMany({ emails, subject, html });
  const anyOk = results.some(r => r.ok);
  if (!anyOk) return res.status(502).json({ error: 'Email provider error' });
  res.json({ ok: true, sent: results.filter(r => r.ok).length });
});

export default router;
