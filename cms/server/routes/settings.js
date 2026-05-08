import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { invalidateSettingsCache, setCachedSettings } from '../utils/settingsCache.js';

function withSectionDefaults(doc = {}) {
  const sections = doc.sections && typeof doc.sections === 'object' ? doc.sections : {};
  return {
    ...doc,
    sections: {
      ...sections,
      writings: {
        enabled: sections.writings?.enabled !== false,
      },
      projects: {
        enabled: sections.projects?.enabled !== false,
      },
      books: {
        enabled: sections.books?.enabled !== false,
      },
    },
  };
}

export default function settingsRoutes(db) {
  const router = Router();
  const col = db.collection('settings');

  router.get('/public', async (_req, res) => {
    const doc = await col.findOne({ key: 'settings' });
    res.json(withSectionDefaults(doc || {}));
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const doc = await col.findOne({ key: 'settings' });
    res.json(withSectionDefaults(doc || {}));
  });

  router.put('/', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    const normalized = withSectionDefaults(data);
    normalized.key = 'settings';
    normalized.updatedAt = new Date();
    await col.updateOne({ key: 'settings' }, { $set: normalized }, { upsert: true });
    // Update cache immediately so subsequent requests are fast
    setCachedSettings(normalized);
    res.json({ message: 'Updated' });
  });

  return router;
}
