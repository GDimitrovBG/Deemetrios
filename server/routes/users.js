import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, парола и име са задължителни' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Паролата трябва да е мин. 6 символа' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: 'Потребител с този email вече съществува' });
    }
    const user = await User.create({
      email, password, name,
      role: ['admin', 'editor'].includes(role) ? role : 'editor',
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при създаване' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, active, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Потребителят не е намерен' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined && ['admin', 'editor'].includes(role)) user.role = role;
    if (active !== undefined) user.active = active;
    if (password && password.length >= 6) user.password = password;

    await user.save();
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email вече се използва' });
    }
    res.status(500).json({ error: 'Грешка при обновяване' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Не можете да изтриете себе си' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Потребителят е изтрит' });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

export default router;
