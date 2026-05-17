import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';

export default function categoriesRoutes(db) {
  const router = Router();
  const col = db.collection('categories');

  // Public: get categories for a specific section
  router.get('/public/:section', async (req, res) => {
    const { section } = req.params;
    if (!['projects', 'writings', 'books'].includes(section)) {
      return res.status(400).json({ error: 'Invalid section. Use: projects, writings, books' });
    }
    const items = await col
      .find({ section, enabled: { $ne: false } })
      .sort({ order: 1, _id: 1 })
      .toArray();
    res.json(items);
  });

  // Admin: list all categories (optionally filtered by section)
  router.get('/', authMiddleware, async (req, res) => {
    const filter = {};
    if (req.query.section) {
      filter.section = req.query.section;
    }
    const items = await col.find(filter).sort({ section: 1, order: 1, _id: 1 }).toArray();
    res.json(items);
  });

  // Admin: get single category
  router.get('/:id', authMiddleware, async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const item = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!item) return res.status(404).json({ error: 'Category not found' });
    res.json(item);
  });

  // Admin: create category
  router.post('/', authMiddleware, async (req, res) => {
    const { section, value, label, icon, enabled, order } = req.body;

    if (!section || !value || !label) {
      return res.status(400).json({ error: 'section, value, and label are required' });
    }
    if (!['projects', 'writings', 'books'].includes(section)) {
      return res.status(400).json({ error: 'Invalid section. Use: projects, writings, books' });
    }

    // Check for duplicate value within the same section
    const existing = await col.findOne({ section, value });
    if (existing) {
      return res.status(409).json({ error: `Category "${value}" already exists in ${section}` });
    }

    const doc = {
      section,
      value,
      label: typeof label === 'string' ? { en: label, id: label } : label,
      icon: icon || '',
      enabled: enabled !== false,
      order: typeof order === 'number' ? order : 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await col.insertOne(doc);
    doc._id = result.insertedId;
    res.status(201).json(doc);
  });

  // Admin: update category
  router.put('/:id', authMiddleware, async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const { section, value, label, icon, enabled, order } = req.body;
    const update = { updatedAt: new Date() };

    if (section !== undefined) update.section = section;
    if (value !== undefined) update.value = value;
    if (label !== undefined) update.label = typeof label === 'string' ? { en: label, id: label } : label;
    if (icon !== undefined) update.icon = icon;
    if (enabled !== undefined) update.enabled = !!enabled;
    if (order !== undefined) update.order = order;

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ error: 'Category not found' });
    res.json(result);
  });

  // Admin: toggle enable/disable
  router.patch('/:id/toggle', authMiddleware, async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const current = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!current) return res.status(404).json({ error: 'Category not found' });

    const newEnabled = !current.enabled;

    await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { enabled: newEnabled, updatedAt: new Date() } }
    );

    res.json({ _id: current._id, enabled: newEnabled });
  });

  // Admin: delete category
  router.delete('/:id', authMiddleware, async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const cat = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // Check if any items use this category
    const collectionName = cat.section === 'projects' ? 'projects'
      : cat.section === 'writings' ? 'writings' : 'books';
    const count = await db.collection(collectionName).countDocuments({ category: cat.value });
    if (count > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${count} item(s) still use category "${cat.value}". Disable it instead.`,
        count,
      });
    }

    await col.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted', _id: cat._id });
  });

  return router;
}
