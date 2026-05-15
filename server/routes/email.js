import { Router } from 'express';
import { sendEmail, emailConfigured } from '../lib/email.js';

const router = Router();

router.post('/send-booking', async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Email not configured' });
  const { to, toName, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to or subject' });

  const result = await sendEmail({ to, toName, subject, html });
  if (!result.ok) return res.status(502).json({ error: 'Email provider error' });
  res.json({ ok: true });
});

export default router;
