import { Router } from 'express';
import Article from '../models/Article.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public: list visible articles (authenticated users can pass ?all=1 to see drafts)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const showAll = req.query.all === '1' && req.user; // req.user set by optional auth below
    const filter = showAll ? {} : { visible: true };
    const articles = await Article.find(filter)
      .sort({ date: -1 })
      .populate('author', 'name');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Public: single article
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'name');
    if (!article) return res.status(404).json({ error: 'Статията не е намерена' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане' });
  }
});

// Protected: create
router.post('/', requireAuth, async (req, res) => {
  try {
    const article = await Article.create({ ...req.body, author: req.user._id });
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при създаване' });
  }
});

// Protected: update
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ error: 'Статията не е намерена' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: 'Грешка при обновяване' });
  }
});

// Protected: delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Изтрито' });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

export default router;
