import { Router } from 'express';
import Booking from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail, sendEmailToMany, getAdminEmails, emailConfigured, bookingAdminEmail, bookingCustomerEmail } from '../lib/email.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Marketing attribution is private to these accounts. Enforced server-side (not
// just hidden in the UI) so it never leaves the API for anyone else, even via
// devtools. Keep this list in sync with ANALYTICS_OWNER_EMAILS in src/admin.jsx.
const ANALYTICS_OWNER_EMAILS = ['workdesigneu@gmail.com'];
const canSeeAttribution = (user) =>
  ANALYTICS_OWNER_EMAILS.includes(String(user?.email || '').toLowerCase());
function redactAttribution(doc, user) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  if (!canSeeAttribution(user)) delete obj.attribution;
  return obj;
}

// Attribution arrives from the public form, so treat it as untrusted: keep only
// known keys and hard-cap every string. Never let a marketing field bloat the
// document or smuggle markup into the admin email.
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

// Public: create booking (from website form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, type, location, date, time, dressRefs, budget, notes, attribution, lang } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Име и email са задължителни' });
    }
    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({ error: 'Невалиден email адрес' });
    }
    // Length caps — prevents oversized payloads and email injection in notes
    if (String(name).length   > 200)  return res.status(400).json({ error: 'Името е твърде дълго' });
    if (String(phone || '').length > 30) return res.status(400).json({ error: 'Невалиден телефон' });
    if (String(notes || '').length > 2000) return res.status(400).json({ error: 'Бележките са твърде дълги' });
    if (Array.isArray(dressRefs) && dressRefs.length > 20) {
      return res.status(400).json({ error: 'Твърде много рокли' });
    }
    const booking = await Booking.create({
      name:     String(name).trim(),
      email:    String(email).toLowerCase().trim(),
      phone:    phone  ? String(phone).trim()  : undefined,
      notes:    notes  ? String(notes).trim()  : undefined,
      type, location, date, time,
      dressRefs: dressRefs || [], budget,
      attribution: cleanAttribution(attribution),
    });
    res.status(201).json(booking);

    // Notify admins server-side. Done AFTER the response and fire-and-forget, so
    // a slow/failed email never blocks or breaks the booking. The public form is
    // anonymous, so this can't be done with the auth-protected /notify-admins
    // endpoint — and gating it behind real booking creation (which is rate
    // limited) prevents the spam abuse that endpoint's auth was guarding against.
    if (emailConfigured()) {
      const subject = `Нова консултация: ${booking.name} — ${booking.type || 'заявка'}${booking.date ? ' — ' + booking.date : ''}`;
      const admins = getAdminEmails();
      // The lead-source banner is private to the analytics owner(s): they get
      // the email with it, everyone else on ADMIN_EMAILS gets the same email
      // without it.
      const owners = admins.filter(e => canSeeAttribution({ email: e }));
      const others = admins.filter(e => !canSeeAttribution({ email: e }));
      const onErr = err => console.error('[bookings] admin notify failed:', err?.message || err);
      if (owners.length) {
        sendEmailToMany({ emails: owners, subject, html: bookingAdminEmail(booking, { includeSource: true }) }).catch(onErr);
      }
      if (others.length) {
        sendEmailToMany({ emails: others, subject, html: bookingAdminEmail(booking, { includeSource: false }) }).catch(onErr);
      }

      // Confirmation to the customer. Also server-side: the browser used to
      // POST the recipient and the full HTML body to a public endpoint, which
      // made /api/email/send-customer an open relay for our own domain. The
      // recipient here can only ever be the address stored on the booking.
      const custLang = lang === 'en' ? 'en' : 'bg';
      sendEmail({
        to: booking.email,
        toName: booking.name,
        subject: custLang === 'en'
          ? 'Booking Confirmation — Areti Bridal Salon'
          : 'Потвърждение за консултация — Булчински салон Арети',
        html: bookingCustomerEmail(booking, custLang),
      }).catch(err => console.error('[bookings] customer confirmation failed:', err?.message || err));
    }
  } catch (err) {
    res.status(500).json({ error: 'Грешка при записване' });
  }
});

// Protected: list all
router.get('/', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings.map(b => redactAttribution(b, req.user)));
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Protected: update status
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ error: 'Резервацията не е намерена' });
    res.json(redactAttribution(booking, req.user));
  } catch (err) {
    res.status(500).json({ error: 'Грешка при обновяване' });
  }
});

// Protected: delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Изтрито' });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

export default router;
