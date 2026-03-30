import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';

export default function projectsRoutes(db) {
  const router = Router();
  const col = db.collection('projects');

  // Public
  router.get('/public', async (_req, res) => {
    // Show published items AND scheduled items whose publishAt has passed
    const now = new Date();
    const items = await col.find({
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: now } }
      ]
    }).sort({ createdAt: -1, _id: -1 }).toArray();
    res.json(items);
  });

  router.get('/public/:id', async (req, res) => {
    const now = new Date();
    const item = await col.findOne({
      id: req.params.id,
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: now } }
      ]
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  // Admin CRUD
  router.get('/', authMiddleware, async (_req, res) => {
    const items = await col.find().sort({ updatedAt: -1, createdAt: -1, _id: -1 }).toArray();
    res.json(items);
  });

  router.post('/', authMiddleware, async (req, res) => {
    const data = req.body;
    data.createdAt = new Date();
    data.updatedAt = new Date();
    // Convert publishAt string to Date if present
    if (data.publishAt) {
      data.publishAt = new Date(data.publishAt);
    }
    const result = await col.insertOne(data);
    res.status(201).json({ ...data, _id: result.insertedId });
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.updatedAt = new Date();
    // Convert publishAt string to Date if present
    if (data.publishAt) {
      data.publishAt = new Date(data.publishAt);
    }
    const result = await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: data }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated' });
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    const result = await col.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  });

  return router;
}
