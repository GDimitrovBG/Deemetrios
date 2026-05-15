import { Router } from 'express';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и парола са задължителни' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Грешен email или парола' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Грешен email или парола' });
    }
    const token = signToken(user._id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при вход' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Невалидна парола (мин. 6 символа)' });
    }
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ error: 'Грешна текуща парола' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Паролата е сменена' });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при смяна на парола' });
  }
});

export default router;
