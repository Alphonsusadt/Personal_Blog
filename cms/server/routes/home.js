import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export default function homeRoutes(db) {
  const router = Router();
  const col = db.collection('home');

  router.get('/public', async (_req, res) => {
    const doc = await col.findOne({ key: 'home' });
    res.json(doc || {});
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const doc = await col.findOne({ key: 'home' });
    res.json(doc || {});
  });

  router.put('/', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.key = 'home';
    data.updatedAt = new Date();
    await col.updateOne({ key: 'home' }, { $set: data }, { upsert: true });
    res.json({ message: 'Updated' });
  });

  return router;
}
