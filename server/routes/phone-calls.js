import { Router } from 'express';
import PhoneCall from '../models/PhoneCall.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Attribution stays inside the analytics-owner boundary — same list and same
// redact rule as bookings. Keep this array in sync with the one in bookings.js.
const ANALYTICS_OWNER_EMAILS = ['workdesigneu@gmail.com'];
const canSeeAttribution = (user) =>
  ANALYTICS_OWNER_EMAILS.includes(String(user?.email || '').toLowerCase());
function redactAttribution(doc, user) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  if (!canSeeAttribution(user)) delete obj.attribution;
  return obj;
}

// Attribution arrives from a public endpoint. Same untrusted-input treatment
// as bookings — mirror the cleaners so a mismatch in bookings.js doesn't
// silently degrade this endpoint or vice versa.
const TOUCH_KEYS = ['source','medium','campaign','content','term','gclid','fbclid','referrer','landing','ts'];
function cleanTouch(t) {
  if (!t || typeof t !== 'object') return undefined;
  const out = {};
  let any = false;
  for (const k of TOUCH_KEYS) {
    if (t[k] != null && t[k] !== '') { out[k] = String(t[k]).slice(0, 200); any = true; }
  }
  return any ? out : undefined;
}
function cleanAttribution(a) {
  if (!a || typeof a !== 'object') return undefined;
  const first = cleanTouch(a.first);
  const last  = cleanTouch(a.last);
  const label = a.label ? String(a.label).slice(0, 200) : '';
  const lastLabel = a.lastLabel ? String(a.lastLabel).slice(0, 200) : '';
  if (!first && !last && !label) return undefined;
  return { first, last, label, lastLabel };
}

// Public: log a tel: tap. Fire-and-forget — the client already opened the
// dialer; if this POST fails we just lose one row, so a 500 is fine and
// nothing else in the tap path depends on the response.
router.post('/', async (req, res) => {
  try {
    const { source, page, attribution } = req.body || {};
    const doc = await PhoneCall.create({
      source: source ? String(source).slice(0, 40) : 'unknown',
      page:   page   ? String(page).slice(0, 500)  : '',
      attribution: cleanAttribution(attribution),
    });
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при запис' });
  }
});

// Protected: list — powers the dashboard breakdown by source and the recent list.
router.get('/', requireAuth, async (req, res) => {
  try {
    const calls = await PhoneCall.find().sort({ createdAt: -1 }).limit(1000);
    res.json(calls.map(c => redactAttribution(c, req.user)));
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

export default router;
