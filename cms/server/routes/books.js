import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';

async function isSectionEnabled(db, sectionKey) {
  const settings = await db.collection('settings').findOne({ key: 'settings' });
  return settings?.sections?.[sectionKey]?.enabled !== false;
}

export default function booksRoutes(db) {
  const router = Router();
  const col = db.collection('books');

  router.get('/public', async (_req, res) => {
    const enabled = await isSectionEnabled(db, 'books');
    if (!enabled) return res.json([]);
    // Show published items AND scheduled items whose publishAt has passed
    const now = new Date();
    const items = await col.find({
      visible: { $ne: false },
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: now } }
      ]
    }).sort({ createdAt: -1, _id: -1 }).toArray();
    res.json(items);
  });

  router.get('/public/:id', async (req, res) => {
    const enabled = await isSectionEnabled(db, 'books');
    if (!enabled) return res.status(404).json({ error: 'Not found' });
    const now = new Date();
    const item = await col.findOne({
      id: req.params.id,
      visible: { $ne: false },
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: now } }
      ]
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const items = await col.find().sort({ updatedAt: -1, createdAt: -1, _id: -1 }).toArray();
    res.json(items);
  });

  router.post('/', authMiddleware, async (req, res) => {
    const data = req.body;
    data.createdAt = new Date();
    data.updatedAt = new Date();
    data.visible = data.visible !== false; // Default to true
    // Convert publishAt string to Date if present
    if (data.publishAt) {
      data.publishAt = new Date(data.publishAt);
    }

    const enabled = await isSectionEnabled(db, 'books');
    if (!enabled) {
      if (data.status === 'published' || data.status === 'scheduled') {
        data.status = 'draft';
      }
      delete data.publishAt;
    }

    const result = await col.insertOne(data);
    res.status(201).json({ ...data, _id: result.insertedId });
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.updatedAt = new Date();
    data.visible = data.visible !== false; // Default to true
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

    const enabled = await isSectionEnabled(db, 'books');
    const targetId = new ObjectId(req.params.id);
    const existing = await col.findOne({ _id: targetId });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (!enabled) {
      const existingStatus = existing.status || 'draft';
      const requestedStatus = data.status ?? existingStatus;
      const existingIsPublic = existingStatus === 'published' || existingStatus === 'scheduled';
      const requestedIsPublic = requestedStatus === 'published' || requestedStatus === 'scheduled';

      if (!existingIsPublic && requestedIsPublic) {
        return res.status(400).json({ error: 'Library section is disabled. Publishing is not allowed.' });
      }

      if (existingIsPublic && requestedIsPublic && requestedStatus !== existingStatus) {
        data.status = existingStatus;
        if (existingStatus === 'scheduled') {
          data.publishAt = existing.publishAt;
        } else {
          delete data.publishAt;
        }
      }

      if (!existingIsPublic) {
        data.status = 'draft';
        delete data.publishAt;
      }

      if (existingIsPublic && requestedStatus === 'draft') {
        data.status = 'draft';
        delete data.publishAt;
      }
    }

    const result = await col.updateOne(
      { _id: targetId },
      { $set: data }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
