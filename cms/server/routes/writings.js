import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { queueAutosave } from '../utils/autosaveQueue.js';
import { dualWrite, syncMongoToSupabase } from '../utils/dataSync.js';
import { isSectionEnabled } from '../utils/settingsCache.js';

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

    const result = await trySupabase(
      async () => {
        // Try Supabase first
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .order('createdAt', { ascending: false });
        if (error) throw error;
        
        // If Supabase has published articles, return them
        if (data && data.length > 0) {
          return data.map(parseSupabaseJson);
        }
        
        // Fallback to MongoDB if Supabase is empty
        const items = await fallbackCol.find({
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        }).sort({ createdAt: -1, date: -1 }).toArray();
        return items.map(parseSupabaseJson);
      },
      async () => {
        // Fallback to MongoDB if Supabase is down/error
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
        // Try Supabase first
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .eq('id', req.params.id)
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .maybeSingle(); // maybeSingle handles "not found" gracefully (returns null instead of throwing)
        if (error) throw error;
        
        if (data) {
          return parseSupabaseJson(data);
        }
        
        // Fallback to MongoDB if not found in Supabase
        const item = await fallbackCol.findOne({
          id: req.params.id,
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        });
        return item ? parseSupabaseJson(item) : null;
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
    // NOTE: served from Supabase first (Mongo fallback). Mongo and Supabase have
    // historically diverged for this project (writings exist in Supabase that were
    // never in Mongo), so Supabase is the authoritative list here. Deletes MUST
    // therefore reliably mark the Supabase row 'deleted' (see the DELETE handler).
    const result = await trySupabase(
      async () => {
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .neq('status', 'deleted')
          .order('updatedAt', { ascending: false });
        if (error) throw error;
        return data.map(d => parseSupabaseJson({ ...d, _id: d._id }));
      },
      async () => {
        const items = await fallbackCol.find({ status: { $ne: 'deleted' } }).sort({ updatedAt: -1, createdAt: -1, date: -1 }).toArray();
        // Apply same transformation for consistency
        return items.map(d => parseSupabaseJson({ ...d, _id: d._id }));
      }
    );

    res.json(result);
  });

  router.post('/', authMiddleware, async (req, res) => {
    const data = req.body;
    data.createdAt = new Date();
    data.updatedAt = new Date();
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
      if (data.id) {
        const existing = await fallbackCol.findOne({ id: data.id });
        if (existing) {
          if (data.id.includes('-draft-') || existing.status === 'draft') {
            // Re-use existing document and update it to maintain idempotency and prevent duplicates
            const syncResult = await dualWrite(db, 'writings', 'artikel', existing._id.toString(), data);
            if (!syncResult.success) {
              return res.status(500).json({ error: 'Failed to save data' });
            }
            if (data.id) {
              queueAutosave('writings', data.id, data);
            }
            return res.status(201).json({ ...data, _id: existing._id.toString() });
          } else {
            return res.status(400).json({ error: 'A writing with this slug already exists' });
          }
        }
      }

      // Dual-write to both MongoDB and Supabase
      const syncResult = await dualWrite(db, 'writings', 'artikel', null, data);
      
      if (!syncResult.success) {
        return res.status(500).json({ error: 'Failed to save data' });
      }

      // Queue autosave if needed
      if (data.id) {
        queueAutosave('writings', data.id, data);
      }

      res.status(201).json({ ...data, _id: syncResult.data?._id || syncResult.data?.insertedId });
    } catch (error) {
      console.error('POST /writings error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { _id, id, ...data } = req.body;
      data.updatedAt = new Date();
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
        updatedAt: new Date(),
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
      const lookupId = req.params.id;
      // The admin list reads from Supabase first (see GET '/'), so `_id` sent by the
      // client may be a real Mongo ObjectId OR a Supabase-generated UUID — never assume.
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(lookupId);

      let existing = await fallbackCol.findOne(isObjectId ? { _id: new ObjectId(lookupId) } : { id: lookupId });
      let slug = existing?.id;
      let sourceDoc = existing;

      if (!slug && supabase) {
        // Not in Mongo at all yet (writing only synced to Supabase) — resolve via its own _id column
        try {
          const { data } = await supabase.from('artikel').select('*').eq('_id', lookupId).maybeSingle();
          if (data) {
            slug = data.id;
            sourceDoc = parseSupabaseJson(data);
          }
        } catch (err) {
          console.warn('[writings] Supabase lookup by _id failed:', err.message);
        }
      }

      if (!slug) {
        return res.status(404).json({ error: 'Writing not found' });
      }

      const updateData = {
        ...sourceDoc,
        id: slug,
        status: 'deleted',
        visible: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };
      delete updateData._id;

      // 1. Soft-delete in MongoDB, matched (and created if missing) by the slug `id`
      await fallbackCol.updateOne({ id: slug }, { $set: updateData }, { upsert: true });

      // 2. Propagate the soft-delete to Supabase. The admin list is served FROM
      // Supabase, so this MUST land — otherwise the "deleted" writing keeps showing
      // and the delete looks like it did nothing. Update only the soft-delete
      // columns (avoids schema pitfalls from writing back the whole doc). The
      // Supabase client returns errors rather than throwing, so check it and fail
      // loudly with a non-2xx instead of returning a false "success".
      if (supabase) {
        const { error: sbErr } = await supabase
          .from('artikel')
          .update({ status: 'deleted', visible: false })
          .eq('id', slug);
        if (sbErr) {
          console.error('[writings] Supabase soft-delete failed:', sbErr.message);
          return res.status(502).json({ error: 'Gagal menyinkronkan penghapusan ke Supabase: ' + sbErr.message });
        }
      }

      res.json({ message: 'Deleted' });
    } catch (error) {
      console.error('DELETE /writings/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
