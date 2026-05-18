import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { queueAutosave } from '../utils/autosaveQueue.js';
import { dualWrite, dualDelete, syncMongoToSupabase } from '../utils/dataSync.js';

async function isSectionEnabled(db, sectionKey) {
  const settings = await db.collection('settings').findOne({ key: 'settings' });
  return settings?.sections?.[sectionKey]?.enabled !== false;
}

// Helper: try supabase, fall back to mongo on any error
async function trySupabase(supabaseFn, mongoFn) {
  if (supabase) {
    try {
      return await supabaseFn();
    } catch (err) {
      console.warn('[writings] Supabase unavailable, falling back to MongoDB:', err?.message || err);
    }
  }
  return mongoFn();
}

const SUPABASE_STRIP_FIELDS = ['translationOfId', 'contentLanguage'];

function stripForSupabase(data) {
  const cleaned = { ...data };
  for (const field of SUPABASE_STRIP_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

// Helper: Safely parse JSON string back to object
function parseSupabaseJson(data) {
  if (!data) return data;
  const parsed = { ...data };
  const jsonFields = ['title', 'excerpt', 'content', 'description', 'review'];
  for (const field of jsonFields) {
    if (typeof parsed[field] === 'string' && (parsed[field].startsWith('{') || parsed[field].startsWith('['))) {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch (e) {
        // ignore parse errors, keep as string
      }
    }
  }
  return parsed;
}

export default function writingsRoutes(db) {
  const router = Router();
  const fallbackCol = db.collection('writings');

  router.get('/public', async (_req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.json([]);
    const now = new Date().toISOString();

    // Try MongoDB first (most up-to-date), Supabase as fallback
    const result = await trySupabase(
      async () => {
        // Try MongoDB first - it's the primary source
        const items = await fallbackCol.find({
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        }).sort({ createdAt: -1, date: -1 }).toArray();
        
        // Check if we have items with content
        if (items.length > 0 && items[0].content) {
          return items.map(parseSupabaseJson);
        }
        
        // If MongoDB is empty, try Supabase
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data.map(parseSupabaseJson);
      },
      async () => {
        // Fallback - use MongoDB
        const items = await fallbackCol.find({
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        }).sort({ createdAt: -1, date: -1 }).toArray();
        return items.map(parseSupabaseJson);
      }
    );

    res.json(result);
  });

  router.get('/public/:id', async (req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();

    const result = await trySupabase(
      async () => {
        // Try MongoDB first
        const item = await fallbackCol.findOne({
          id: req.params.id,
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        });
        
        if (item && item.content) {
          return parseSupabaseJson(item);
        }
        
        // If MongoDB doesn't have it, try Supabase
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .eq('id', req.params.id)
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .single();
        if (error) throw error;
        return parseSupabaseJson(data);
      },
      async () => {
        const item = await fallbackCol.findOne({
          id: req.params.id,
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        });
        return item ? parseSupabaseJson(item) : null;
      }
    );

    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const result = await trySupabase(
      async () => {
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .order('updatedAt', { ascending: false });
        if (error) throw error;
        return data.map(d => parseSupabaseJson({ ...d, _id: d._id }));
      },
      async () => {
        const items = await fallbackCol.find().sort({ updatedAt: -1, createdAt: -1, date: -1 }).toArray();
        // Apply same transformation for consistency
        return items.map(d => parseSupabaseJson({ ...d, _id: d._id }));
      }
    );

    res.json(result);
  });

  router.post('/', authMiddleware, async (req, res) => {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    data.visible = data.visible !== false; 
    
    if (data.publishAt === '') data.publishAt = null;

    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) {
      if (data.status === 'published' || data.status === 'scheduled') {
        data.status = 'draft';
      }
      data.publishAt = null;
    }

    try {
      // Dual-write to both MongoDB and Supabase
      const syncResult = await dualWrite(db, 'writings', 'artikel', null, data);
      
      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to save data' });
      }

      // Queue autosave if needed
      if (data.id) {
        queueAutosave('writings', data.id, data);
      }

      res.status(201).json({ ...data, _id: syncResult.data._id });
    } catch (error) {
      console.error('POST /writings error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { _id, id, ...data } = req.body;
      data.updatedAt = new Date().toISOString();
      data.visible = data.visible !== false;
      
      if (data.publishAt === '') data.publishAt = null;
      
      const enabled = await isSectionEnabled(db, 'writings');

      // Validate publishing permissions
      if (!enabled && (data.status === 'published' || data.status === 'scheduled')) {
        return res.status(400).json({ error: 'Writings section is disabled. Publishing not allowed.' });
      }

      const lookupId = _id || req.params.id;

      // Dual-write to both MongoDB and Supabase
      const syncResult = await dualWrite(db, 'writings', 'artikel', lookupId, data);
      
      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to update data' });
      }

      // Queue autosave if it's a patch update
      if (data.id) {
        queueAutosave('writings', data.id, data);
      }

      res.json({ message: 'Updated', data });
    } catch (error) {
      console.error('PUT /writings/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/:id', authMiddleware, async (req, res) => {
    try {
      const { _id, clientVersion, ...fields } = req.body;

      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const $setDoc = {
        ...fields,
        updatedAt: new Date().toISOString(),
        ...(clientVersion != null ? { _clientVersion: clientVersion } : {}),
      };

      if ($setDoc.publishAt === '') $setDoc.publishAt = null;

      const enabled = await isSectionEnabled(db, 'writings');
      if (!enabled && ($setDoc.status === 'published' || $setDoc.status === 'scheduled')) {
        $setDoc.status = 'draft';
        $setDoc.publishAt = null;
      }

      queueAutosave('writings', _id || req.params.id, $setDoc);
      res.json({ message: 'Queued for autosave' });
    } catch (err) {
      console.error('[autosave] PATCH /writings/:id failed:', err);
      res.status(500).json({ error: 'Autosave queueing failed' });
    }
  });

  router.post('/admin/sync-to-supabase', authMiddleware, async (req, res) => {
    try {
      console.log('[Sync] Admin triggered sync: MongoDB → Supabase');
      const syncResult = await syncMongoToSupabase(db, 'writings', 'artikel');
      
      if (!syncResult.success) {
        return res.status(500).json({ error: 'Sync failed', ...syncResult });
      }

      res.json({ 
        message: 'Sync completed successfully',
        successCount: syncResult.successCount,
        errorCount: syncResult.errorCount 
      });
    } catch (error) {
      console.error('Sync endpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      // Dual-delete from both MongoDB and Supabase
      const deleteResult = await dualDelete(db, 'writings', 'artikel', req.params.id);
      
      if (!deleteResult.success) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json({ message: 'Deleted', deleted: deleteResult.deleted });
    } catch (error) {
      console.error('DELETE /writings/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
