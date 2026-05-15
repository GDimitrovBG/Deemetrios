import { Router } from 'express';
import Setting from '../models/Setting.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const DEFAULTS = {
  phone: '+359 2 987 65 43',
  email: 'info@areti.bg',
  address: 'бул. Витоша 112, София 1463',
  hours: {
    'Пон': { open: true,  from: '10:00', to: '19:00' },
    'Вт':  { open: true,  from: '10:00', to: '19:00' },
    'Ср':  { open: true,  from: '10:00', to: '19:00' },
    'Чет': { open: true,  from: '10:00', to: '19:00' },
    'Пет': { open: true,  from: '10:00', to: '19:00' },
    'Съб': { open: true,  from: '11:00', to: '17:00' },
    'Нед': { open: false, from: '11:00', to: '17:00' },
  },
};

// Public: get settings
router.get('/', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'site' });
    res.json(doc ? doc.value : DEFAULTS);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Admin only: update settings
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const doc = await Setting.findOneAndUpdate(
      { key: 'site' },
      { key: 'site', value: req.body },
      { upsert: true, new: true }
    );
    res.json(doc.value);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при запазване' });
  }
});

export default router;
