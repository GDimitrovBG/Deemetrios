import { Router } from 'express';
import { sendEmail, emailConfigured } from '../lib/email.js';

const router = Router();

const ALLOWED_RECIPIENTS = [
  process.env.ARETI_EMAIL || 'info@areti.bg',
];

router.post('/send-booking', async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Email not configured' });
  const { to, toName, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to or subject' });

  // Only allow sending to known shop emails — prevent open relay abuse
  if (!ALLOWED_RECIPIENTS.includes(to.toLowerCase().trim())) {
    return res.status(403).json({ error: 'Recipient not allowed' });
  }

  // Basic subject/html length limits
  if (subject.length > 200) return res.status(400).json({ error: 'Subject too long' });
  if (html && html.length > 50000) return res.status(400).json({ error: 'Body too long' });

  const result = await sendEmail({ to, toName, subject, html });
  if (!result.ok) return res.status(502).json({ error: 'Email provider error' });
  res.json({ ok: true });
});

export default router;
