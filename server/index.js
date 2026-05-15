import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

import authRoutes     from './routes/auth.js';
import usersRoutes    from './routes/users.js';
import bookingsRoutes from './routes/bookings.js';
import productsRoutes from './routes/products.js';
import articlesRoutes from './routes/articles.js';
import settingsRoutes from './routes/settings.js';
import seoRoutes      from './routes/seo.js';
import emailRoutes    from './routes/email.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Твърде много опити. Опитайте пак след 15 минути.' },
});
app.use('/api/auth/login', authLimiter);

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Твърде много резервации. Опитайте пак след 1 час.' },
});
app.use('/api/bookings', bookingLimiter);

app.use('/api/auth',     authRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/email',  emailRoutes);
app.use('/api',          seoRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
