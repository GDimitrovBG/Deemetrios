import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/db.js';

async function seed() {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@areti.bg';
  const adminPass  = process.env.ADMIN_PASSWORD || 'areti2026';

  const exists = await User.findOne({ email: adminEmail });
  if (exists) {
    console.log(`Admin user already exists: ${adminEmail}`);
  } else {
    await User.create({
      email: adminEmail,
      password: adminPass,
      name: 'Администратор',
      role: 'admin',
    });
    console.log(`Admin user created: ${adminEmail} / ${adminPass}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
