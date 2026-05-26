import { Router } from 'express';
import Booking from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: create booking (from website form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, type, location, date, time, dressRefs, budget, notes } = req.body;
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
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при записване' });
  }
});

// Protected: list all
router.get('/', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
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
    res.json(booking);
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
