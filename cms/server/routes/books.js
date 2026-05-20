import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { dualWrite } from '../utils/dataSync.js';
import { isSectionEnabled } from '../utils/settingsCache.js';

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
    const items = await col.find({ status: { $ne: 'deleted' } }).sort({ updatedAt: -1, createdAt: -1, _id: -1 }).toArray();
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

    try {
      if (data.id) {
        const existing = await col.findOne({ id: data.id });
        if (existing) {
          if (data.id.includes('-draft-') || existing.status === 'draft') {
            // Re-use existing document and update it to maintain idempotency and prevent duplicates
            const syncResult = await dualWrite(db, 'books', 'books', existing._id.toString(), data);
            if (!syncResult.success) {
              return res.status(500).json({ error: 'Failed to save data' });
            }
            return res.status(201).json({ ...data, _id: existing._id.toString() });
          } else {
            return res.status(400).json({ error: 'A book with this slug already exists' });
          }
        }
      }

      const syncResult = await dualWrite(db, 'books', 'books', null, data);

      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to save data' });
      }

      res.status(201).json({ ...data, _id: syncResult.data?._id || syncResult.data?.insertedId });
    } catch (error) {
      console.error('POST /books error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.updatedAt = new Date();
    data.visible = data.visible !== false; // Default to true
    // Convert publishAt string to Date if present
    if (data.publishAt) {
      data.publishAt = new Date(data.publishAt);
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

    try {
      const syncResult = await dualWrite(db, 'books', 'books', targetId, data);

      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to update data' });
      }

      res.json({ message: 'Updated' });
    } catch (error) {
      console.error('PUT /books/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    const targetId = new ObjectId(req.params.id);

    const existing = await col.findOne({ _id: targetId });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updateData = {
      ...existing,
      status: 'deleted',
      visible: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await dualWrite(db, 'books', 'books', targetId, updateData);
      res.json({ message: 'Deleted' });
    } catch (error) {
      console.error('DELETE /books/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
