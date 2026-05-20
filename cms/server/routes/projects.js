import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { dualWrite } from '../utils/dataSync.js';
import { isSectionEnabled } from '../utils/settingsCache.js';

export default function projectsRoutes(db) {
  const router = Router();
  const col = db.collection('projects');

  // Public
  router.get('/public', async (_req, res) => {
    const enabled = await isSectionEnabled(db, 'projects');
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
    const enabled = await isSectionEnabled(db, 'projects');
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

  // Admin CRUD
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

    const enabled = await isSectionEnabled(db, 'projects');
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
            const syncResult = await dualWrite(db, 'projects', 'projects', existing._id.toString(), data);
            if (!syncResult.success) {
              return res.status(500).json({ error: 'Failed to save data' });
            }
            return res.status(201).json({ ...data, _id: existing._id.toString() });
          } else {
            return res.status(400).json({ error: 'A project with this slug already exists' });
          }
        }
      }

      const syncResult = await dualWrite(db, 'projects', 'projects', null, data);

      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to save data' });
      }

      res.status(201).json({ ...data, _id: syncResult.data?._id || syncResult.data?.insertedId });
    } catch (error) {
      console.error('POST /projects error:', error);
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

    const enabled = await isSectionEnabled(db, 'projects');
    const targetId = new ObjectId(req.params.id);
    const existing = await col.findOne({ _id: targetId });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (!enabled) {
      const existingStatus = existing.status || 'draft';
      const requestedStatus = data.status ?? existingStatus;
      const existingIsPublic = existingStatus === 'published' || existingStatus === 'scheduled';
      const requestedIsPublic = requestedStatus === 'published' || requestedStatus === 'scheduled';

      // Block draft -> (published/scheduled) promotion while section is disabled
      if (!existingIsPublic && requestedIsPublic) {
        return res.status(400).json({ error: 'Projects section is disabled. Publishing is not allowed.' });
      }

      // While disabled, prevent switching between published/scheduled states
      if (existingIsPublic && requestedIsPublic && requestedStatus !== existingStatus) {
        data.status = existingStatus;
        if (existingStatus === 'scheduled') {
          data.publishAt = existing.publishAt;
        } else {
          delete data.publishAt;
        }
      }

      // If saving a draft, ensure it stays draft (no scheduling timestamp)
      if (!existingIsPublic) {
        data.status = 'draft';
        delete data.publishAt;
      }

      // If withdrawing to draft, clear scheduling timestamp
      if (existingIsPublic && requestedStatus === 'draft') {
        data.status = 'draft';
        delete data.publishAt;
      }
    }

    try {
      const syncResult = await dualWrite(db, 'projects', 'projects', targetId, data);

      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to update data' });
      }

      res.json({ message: 'Updated' });
    } catch (error) {
      console.error('PUT /projects/:id error:', error);
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
      await dualWrite(db, 'projects', 'projects', targetId, updateData);
      res.json({ message: 'Deleted' });
    } catch (error) {
      console.error('DELETE /projects/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
