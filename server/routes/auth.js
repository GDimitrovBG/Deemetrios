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
  user.twoFACodeHash = await bcrypt.hash(code, 10);
  user.twoFACodeExpiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
  user.twoFAAttempts = 0;
  await user.save();
  return code;
}

async function consumeCode(user, code) {
  if (!user.twoFACodeHash || !user.twoFACodeExpiresAt) return false;
  if (Date.now() > user.twoFACodeExpiresAt.getTime()) return false;
  if (user.twoFAAttempts >= MAX_ATTEMPTS) return false;

  const match = await bcrypt.compare(code, user.twoFACodeHash);
  if (!match) {
    user.twoFAAttempts = (user.twoFAAttempts || 0) + 1;
    await user.save();
    return false;
  }
  user.twoFACodeHash = null;
  user.twoFACodeExpiresAt = null;
  user.twoFAAttempts = 0;
  await user.save();
  return true;
}

function maskEmail(email) {
  return email.replace(/(.{2}).+(@.+)/, '$1***$2');
}

// Step 1: email + password.
// If 2FA is enabled, sends a code and returns a challenge token instead of session token.
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

    if (user.twoFAEnabled) {
      const code = await issueCode(user);
      await sendEmail({
        to: user.email,
        toName: user.name,
        subject: 'Код за вход — Арети Bridal',
        html: twoFactorCodeEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MIN }),
      });
      return res.json({
        require2FA: true,
        challenge: signChallenge(user._id),
        emailHint: maskEmail(user.email),
      });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при вход' });
  }
});

// Step 2: exchange challenge + email-code for a real session token.
router.post('/verify-2fa', async (req, res) => {
  try {
    const { challenge, code } = req.body;
    if (!challenge || !code) {
      return res.status(400).json({ error: 'Липсва код' });
    }
    const userId = verifyChallenge(challenge);
    if (!userId) {
      return res.status(401).json({ error: 'Сесията изтече — въведете отново парола' });
    }
    const user = await User.findById(userId);
    if (!user || !user.active || !user.twoFAEnabled) {
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

// Resend the 2FA code while a challenge is active.
router.post('/resend-2fa', async (req, res) => {
  try {
    const { challenge } = req.body;
    const userId = verifyChallenge(challenge);
    if (!userId) return res.status(401).json({ error: 'Сесията изтече' });
    const user = await User.findById(userId);
    if (!user || !user.twoFAEnabled) return res.status(401).json({ error: 'Невалиден потребител' });
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

// === 2FA enrollment for the logged-in user ===

// Send a code to the user's own email to begin enabling 2FA.
router.post('/2fa/init', requireAuth, async (req, res) => {
  try {
    if (!emailConfigured()) {
      return res.status(503).json({ error: 'Email не е конфигуриран — добавете BREVO_API_KEY на сървъра' });
    }
    const user = await User.findById(req.user._id);
    const code = await issueCode(user);
    const result = await sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Активиране на 2FA — Арети Bridal',
      html: twoFactorCodeEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MIN }),
    });
    if (!result.ok) return res.status(502).json({ error: 'Email не беше изпратен' });
    res.json({ ok: true, emailHint: maskEmail(user.email) });
  } catch {
    res.status(500).json({ error: 'Грешка при изпращане на код' });
  }
});

// Confirm the emailed code and turn 2FA on.
router.post('/2fa/enable', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Липсва код' });
    const user = await User.findById(req.user._id);
    const ok = await consumeCode(user, String(code).trim());
    if (!ok) return res.status(401).json({ error: 'Грешен или изтекъл код' });
    user.twoFAEnabled = true;
    await user.save();
    res.json({ ok: true, user: user.toJSON() });
  } catch {
    res.status(500).json({ error: 'Грешка при активиране' });
  }
});

// Turn 2FA off — requires current password.
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Въведете паролата си' });
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Грешна парола' });
    user.twoFAEnabled = false;
    user.twoFACodeHash = null;
    user.twoFACodeExpiresAt = null;
    user.twoFAAttempts = 0;
    await user.save();
    res.json({ ok: true, user: user.toJSON() });
  } catch {
    res.status(500).json({ error: 'Грешка при деактивиране' });
  }
});

export default router;
