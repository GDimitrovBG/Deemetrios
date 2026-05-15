import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const SECRET = () => process.env.JWT_SECRET || 'areti-dev-secret-change-me';
const EXPIRES = '7d';

export function signToken(userId) {
  return jwt.sign({ id: userId }, SECRET(), { expiresIn: EXPIRES });
}

export function signChallenge(userId) {
  return jwt.sign({ id: userId, purpose: '2fa' }, SECRET(), { expiresIn: '10m' });
}

export function verifyChallenge(token) {
  try {
    const decoded = jwt.verify(token, SECRET());
    if (decoded.purpose !== '2fa') return null;
    return decoded.id;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Необходима е автентикация' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], SECRET());
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Невалиден потребител' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Невалиден или изтекъл токен' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Нямате права за това действие' });
    }
    next();
  };
}
