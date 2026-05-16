import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { queueAutosave } from '../utils/autosaveQueue.js';

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

// Fields that may not exist in Supabase schema — strip before insert/update
const SUPABASE_STRIP_FIELDS = ['translationOfId', 'contentLanguage'];

function stripForSupabase(data) {
  const cleaned = { ...data };
  for (const field of SUPABASE_STRIP_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
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
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .order('createdAt', { ascending: false });
        if (error) throw error;
        return data;
      },
      async () => {
        return fallbackCol.find({
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        }).sort({ createdAt: -1, date: -1 }).toArray();
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
        const { data, error } = await supabase
          .from('artikel')
          .select('*')
          .eq('id', req.params.id)
          .neq('visible', false)
          .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
          .single();
        if (error) throw error;
        return data;
      },
      async () => {
        return fallbackCol.findOne({
          id: req.params.id,
          visible: { $ne: false },
          $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
        });
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
        return data.map(d => ({ ...d, _id: d._id }));
      },
      async () => {
        return fallbackCol.find().sort({ updatedAt: -1, createdAt: -1, date: -1 }).toArray();
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

    const result = await trySupabase(
      async () => {
        const cleaned = stripForSupabase(data);
        delete cleaned._id;
        const { data: inserted, error } = await supabase
          .from('artikel')
          .insert([cleaned])
          .select()
          .single();
        if (error) throw error;
        return { ...inserted, _id: inserted._id };
      },
      async () => {
        // MongoDB fallback
        if (data.publishAt) data.publishAt = new Date(data.publishAt);
        data.createdAt = new Date();
        data.updatedAt = new Date();
        const result = await fallbackCol.insertOne(data);
        return { ...data, _id: result.insertedId };
      }
    );

    res.status(201).json(result);
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, id, ...data } = req.body;
    data.updatedAt = new Date().toISOString();
    data.visible = data.visible !== false;
    
    if (data.publishAt === '') data.publishAt = null;
    
    const enabled = await isSectionEnabled(db, 'writings');

    // Try supabase first
    let handled = false;
    if (supabase) {
      try {
        const lookupValue = _id || req.params.id;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupValue);
        
        let existing = null;
        let matchCol = '_id';
        
        if (isUUID) {
          const { data: found, error } = await supabase.from('artikel').select('*').eq('_id', lookupValue).single();
          if (!error) { existing = found; matchCol = '_id'; }
        }
        
        if (!existing) {
          const { data: found, error } = await supabase.from('artikel').select('*').eq('id', lookupValue).limit(1).single();
          if (!error) { existing = found; matchCol = 'id'; }
        }
          
        if (!existing) return res.status(404).json({ error: 'Not found' });

        if (!enabled) {
          const existingStatus = existing.status || 'draft';
          const requestedStatus = data.status ?? existingStatus;
          const existingIsPublic = existingStatus === 'published' || existingStatus === 'scheduled';
          const requestedIsPublic = requestedStatus === 'published' || requestedStatus === 'scheduled';

          if (!existingIsPublic && requestedIsPublic) {
            return res.status(400).json({ error: 'Writings section is disabled. Publishing is not allowed.' });
          }
          if (existingIsPublic && requestedIsPublic && requestedStatus !== existingStatus) {
            data.status = existingStatus;
            if (existingStatus === 'scheduled') {
              data.publishAt = existing.publishAt;
            } else {
              data.publishAt = null;
            }
          }
          if (!existingIsPublic) {
            data.status = 'draft';
            data.publishAt = null;
          }
          if (existingIsPublic && requestedStatus === 'draft') {
            data.status = 'draft';
            data.publishAt = null;
          }
        }

        const cleaned = stripForSupabase(data);
        const { error } = await supabase
          .from('artikel')
          .update(cleaned)
          .eq('_id', existing._id);
          
        if (error) throw error;
        handled = true;
        return res.json({ message: 'Updated' });
      } catch (err) {
        console.warn('[writings] PUT Supabase failed, falling back to MongoDB:', err?.message || err);
      }
    }
    
    if (!handled) {
      // MongoDB fallback
      const { ObjectId } = await import('mongodb');
      const lookupValue = _id || req.params.id;
      let filter;
      try {
        filter = { _id: new ObjectId(lookupValue) };
      } catch {
        filter = { id: lookupValue };
      }
      
      const existing = await fallbackCol.findOne(filter);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      
      data.updatedAt = new Date();
      if (data.publishAt) data.publishAt = new Date(data.publishAt);
      
      await fallbackCol.updateOne(filter, { $set: data });
      res.json({ message: 'Updated' });
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

  router.delete('/:id', authMiddleware, async (req, res) => {
    const deleted = await trySupabase(
      async () => {
        const { error } = await supabase
          .from('artikel')
          .delete()
          .eq('_id', req.params.id);
        if (error) throw error;
        return true;
      },
      async () => {
        const { ObjectId } = await import('mongodb');
        let filter;
        try {
          filter = { _id: new ObjectId(req.params.id) };
        } catch {
          filter = { id: req.params.id };
        }
        const result = await fallbackCol.deleteOne(filter);
        if (result.deletedCount === 0) return false;
        return true;
      }
    );
    
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  });

  return router;
}
