import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken, signChallenge, verifyChallenge, requireAuth } from '../middleware/auth.js';
import { sendEmail, twoFactorCodeEmail, emailConfigured } from '../lib/email.js';

const router = Router();

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueCode(user) {
  const code = generateCode();
  user.otpHash = await bcrypt.hash(code, 10);
  user.otpExpiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
  user.otpAttempts = 0;
  await user.save();
  return code;
}

async function consumeCode(user, code) {
  if (!user.otpHash || !user.otpExpiresAt) return false;
  if (Date.now() > user.otpExpiresAt.getTime()) return false;
  if (user.otpAttempts >= MAX_ATTEMPTS) return false;

  const match = await bcrypt.compare(code, user.otpHash);
  if (!match) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    return false;
  }
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  await user.save();
  return true;
}

function maskEmail(email) {
  return email.replace(/(.{2}).+(@.+)/, '$1***$2');
}

// Step 1: email → send OTP code, return challenge token.
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email е задължителен' });
    }
    if (!emailConfigured()) {
      return res.status(503).json({ error: 'Email не е конфигуриран на сървъра' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.active) {
      // Don't reveal whether the email exists
      return res.json({
        challenge: 'invalid',
        emailHint: maskEmail(email),
      });
    }

    const code = await issueCode(user);
    await sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Код за вход — Арети Bridal',
      html: twoFactorCodeEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MIN }),
    });

    return res.json({
      challenge: signChallenge(user._id),
      emailHint: maskEmail(user.email),
    });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при вход' });
  }
});

// Step 2: exchange challenge + OTP code for a session token.
router.post('/verify-code', async (req, res) => {
  try {
    const { challenge, code } = req.body;
    if (!challenge || !code) {
      return res.status(400).json({ error: 'Липсва код' });
    }
    const userId = verifyChallenge(challenge);
    if (!userId) {
      return res.status(401).json({ error: 'Сесията изтече — опитайте отново' });
    }
    const user = await User.findById(userId);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Невалиден потребител' });
    }
    const ok = await consumeCode(user, String(code).trim());
    if (!ok) {
      return res.status(401).json({ error: 'Грешен или изтекъл код' });
    }
    const token = signToken(user._id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при проверка на кода' });
  }
});

// Resend the OTP code while a challenge is active.
router.post('/resend-code', async (req, res) => {
  try {
    const { challenge } = req.body;
    const userId = verifyChallenge(challenge);
    if (!userId) return res.status(401).json({ error: 'Сесията изтече' });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'Невалиден потребител' });
    const code = await issueCode(user);
    await sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Код за вход — Арети Bridal',
      html: twoFactorCodeEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MIN }),
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Грешка при изпращане' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
