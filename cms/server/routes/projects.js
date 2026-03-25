import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';

export default function projectsRoutes(db) {
  const router = Router();
  const col = db.collection('projects');

  // Public
  router.get('/public', async (_req, res) => {
    const items = await col.find({ status: 'published' }).sort({ _id: -1 }).toArray();
    res.json(items);
  });

  router.get('/public/:id', async (req, res) => {
    const item = await col.findOne({ id: req.params.id, status: 'published' });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  // Admin CRUD
  router.get('/', authMiddleware, async (_req, res) => {
    const items = await col.find().sort({ _id: -1 }).toArray();
    res.json(items);
  });

  router.post('/', authMiddleware, async (req, res) => {
    const data = req.body;
    data.createdAt = new Date();
    const result = await col.insertOne(data);
    res.status(201).json({ ...data, _id: result.insertedId });
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.updatedAt = new Date();
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
