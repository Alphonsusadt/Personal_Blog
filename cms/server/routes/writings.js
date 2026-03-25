import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';

export default function writingsRoutes(db) {
  const router = Router();
  const col = db.collection('writings');

  router.get('/public', async (_req, res) => {
    const nowIso = new Date().toISOString();
    const items = await col
      .find({
        $or: [
          { status: 'published' },
          { status: 'scheduled', publishAt: { $lte: nowIso } },
        ],
      })
      .sort({ date: -1 })
      .toArray();
    res.json(items);
  });

  router.get('/public/:id', async (req, res) => {
    const nowIso = new Date().toISOString();
    const item = await col.findOne({
      id: req.params.id,
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: nowIso } },
      ],
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const items = await col.find().sort({ date: -1 }).toArray();
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
