import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Whitelist of fields editors are allowed to set — prevents mass assignment
const ALLOWED = [
  'ref', 'name_bg', 'name_en', 'collection', 'silhouette', 'silhouette_en',
  'price', 'img', 'imgs', 'fabric', 'badge',
  'description_bg', 'description_en',
  'seo_title_bg', 'seo_description_bg', 'seo_title_en', 'seo_description_en',
];
function pick(body) {
  return Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]]));
}

// Public: list all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ ref: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Public: single product by ref
router.get('/:ref', async (req, res) => {
  try {
    const product = await Product.findOne({ ref: req.params.ref });
    if (!product) return res.status(404).json({ error: 'Продуктът не е намерен' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Protected: create
router.post('/', requireAuth, async (req, res) => {
  try {
    const product = await Product.create(pick(req.body));
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Продукт с този реф. номер вече съществува' });
    }
    res.status(500).json({ error: 'Грешка при създаване' });
  }
});

// Protected: update
router.put('/:ref', requireAuth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { ref: req.params.ref },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Продуктът не е намерен' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при обновяване' });
  }
});

// Protected: delete — admin only
router.delete('/:ref', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await Product.findOneAndDelete({ ref: req.params.ref });
    res.json({ message: 'Изтрито' });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

export default router;
