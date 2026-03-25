import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export default function settingsRoutes(db) {
  const router = Router();
  const col = db.collection('settings');

  router.get('/public', async (_req, res) => {
    const doc = await col.findOne({ key: 'settings' });
    res.json(doc || {});
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const doc = await col.findOne({ key: 'settings' });
    res.json(doc || {});
  });

  router.put('/', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.key = 'settings';
    data.updatedAt = new Date();
    await col.updateOne({ key: 'settings' }, { $set: data }, { upsert: true });
    res.json({ message: 'Updated' });
  });

  return router;
}
