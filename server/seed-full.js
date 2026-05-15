/**
 * Full database seed — imports ALL static data into MongoDB:
 *   - 111 products (from data.js)
 *   - 6 blog articles (from blog_data.js)
 *   - default site settings
 *   - admin user
 *
 * Usage:
 *   cd server && node seed-full.js
 *
 * Set env vars or it uses defaults:
 *   MONGODB_URI  — default: mongodb://127.0.0.1:27017/areti
 *   ADMIN_EMAIL  — default: admin@areti.bg
 *   ADMIN_PASSWORD — default: areti2026
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import User from './models/User.js';
import Product from './models/Product.js';
import Article from './models/Article.js';
import Setting from './models/Setting.js';
import connectDB from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Parse JS exports from frontend files ──────────────────────────────────────
function extractArray(code, varName) {
  // Find "export const VARNAME = [" and extract the array
  const regex = new RegExp(`export\\s+const\\s+${varName}\\s*=\\s*\\[`);
  const match = code.match(regex);
  if (!match) return [];

  const startIdx = match.index + match[0].length - 1; // position of "["
  let depth = 0;
  let end = startIdx;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '[') depth++;
    else if (code[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }

  const arrayStr = code.slice(startIdx, end);
  // Convert JS object syntax to valid JSON-ish, then eval (safe — our own files)
  try {
    return new Function(`return ${arrayStr}`)();
  } catch (e) {
    console.error(`Failed to parse ${varName}:`, e.message);
    return [];
  }
}

async function seed() {
  await connectDB();
  console.log('');

  // ── 1. Admin user ──────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@areti.bg';
  const adminPass  = process.env.ADMIN_PASSWORD || 'areti2026';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log(`✓ Admin вече съществува: ${adminEmail}`);
  } else {
    await User.create({ email: adminEmail, password: adminPass, name: 'Администратор', role: 'admin' });
    console.log(`✓ Admin създаден: ${adminEmail} / ${adminPass}`);
  }

  // ── 2. Products ────────────────────────────────────────────────────────────
  const dataPath = path.resolve(__dirname, '../src/data.js');
  const dataCode = readFileSync(dataPath, 'utf-8');
  const dresses = extractArray(dataCode, 'DRESSES');
  console.log(`  Намерени ${dresses.length} продукта в data.js`);

  let prodCreated = 0, prodSkipped = 0;
  for (const d of dresses) {
    const exists = await Product.findOne({ ref: d.ref });
    if (exists) { prodSkipped++; continue; }
    await Product.create({
      ref: d.ref,
      name_bg: d.name_bg || '',
      name_en: d.name_en || '',
      collection: d.collection || 'cosmobella',
      silhouette: d.silhouette || '',
      silhouette_en: d.silhouette_en || '',
      price: d.price || 0,
      img: d.img || '',
      imgs: d.imgs || [],
      fabric: d.fabric || '',
      badge: d.badge || '',
      description_bg: d.description_bg || d.description || '',
      description_en: d.description_en || '',
      seo_title_bg: d.seo_title_bg || '',
      seo_description_bg: d.seo_description_bg || '',
      seo_title_en: d.seo_title_en || '',
      seo_description_en: d.seo_description_en || '',
    });
    prodCreated++;
  }
  console.log(`✓ Продукти: ${prodCreated} създадени, ${prodSkipped} вече съществуващи`);

  // ── 3. Blog articles ───────────────────────────────────────────────────────
  const blogPath = path.resolve(__dirname, '../src/blog_data.js');
  const blogCode = readFileSync(blogPath, 'utf-8');
  const posts = extractArray(blogCode, 'BLOG_POSTS');
  console.log(`  Намерени ${posts.length} статии в blog_data.js`);

  let artCreated = 0, artSkipped = 0;
  for (const p of posts) {
    // Check by title since blog posts don't have stable IDs across systems
    const exists = await Article.findOne({ title_bg: p.title });
    if (exists) { artSkipped++; continue; }

    const admin = await User.findOne({ role: 'admin' });
    await Article.create({
      title_bg: p.title || '',
      title_en: '',
      excerpt_bg: p.excerpt || '',
      excerpt_en: '',
      content: p.content || '',
      img: p.image || '',
      date: p.isoDate || new Date().toISOString().slice(0, 10),
      category: p.category || 'Блог',
      visible: true,
      relatedRefs: p.relatedRefs || [],
      seo_title: '',
      seo_description: '',
      author: admin?._id,
    });
    artCreated++;
  }
  console.log(`✓ Статии: ${artCreated} създадени, ${artSkipped} вече съществуващи`);

  // ── 4. Default settings ────────────────────────────────────────────────────
  const existingSettings = await Setting.findOne({ key: 'site' });
  if (existingSettings) {
    console.log(`✓ Настройки вече съществуват`);
  } else {
    await Setting.create({
      key: 'site',
      value: {
        phone: '+359 2 987 65 43',
        email: 'info@areti.bg',
        address: 'бул. Витоша 112, София 1463',
        hours: {
          'Пон': { open: true, from: '10:00', to: '19:00' },
          'Вт':  { open: true, from: '10:00', to: '19:00' },
          'Ср':  { open: true, from: '10:00', to: '19:00' },
          'Чет': { open: true, from: '10:00', to: '19:00' },
          'Пет': { open: true, from: '10:00', to: '19:00' },
          'Съб': { open: true, from: '11:00', to: '17:00' },
          'Нед': { open: false, from: '11:00', to: '17:00' },
        },
      },
    });
    console.log(`✓ Настройки създадени`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    users: await User.countDocuments(),
    products: await Product.countDocuments(),
    articles: await Article.countDocuments(),
    settings: await Setting.countDocuments(),
  };
  console.log('\n═══ База данни ═══');
  console.log(`  Потребители: ${counts.users}`);
  console.log(`  Продукти:    ${counts.products}`);
  console.log(`  Статии:      ${counts.articles}`);
  console.log(`  Настройки:   ${counts.settings}`);
  console.log('');

  await mongoose.disconnect();
  console.log('Готово!');
}

seed().catch(err => { console.error('Seed грешка:', err); process.exit(1); });
