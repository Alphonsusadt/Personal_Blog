import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { queueAutosave } from '../utils/autosaveQueue.js';

async function isSectionEnabled(db, sectionKey) {
  const settings = await db.collection('settings').findOne({ key: 'settings' });
  return settings?.sections?.[sectionKey]?.enabled !== false;
}

export default function writingsRoutes(db) {
  const router = Router();
  const fallbackCol = db.collection('writings');

  router.get('/public', async (_req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.json([]);
    const now = new Date().toISOString();
    
    if (supabase) {
      const { data, error } = await supabase
        .from('artikel')
        .select('*')
        .neq('visible', false)
        .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
        .order('createdAt', { ascending: false });
      if (error) {
        console.error('Supabase error (public list):', error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    } else {
      // Fallback
      const items = await fallbackCol.find({
        visible: { $ne: false },
        $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
      }).sort({ createdAt: -1, date: -1 }).toArray();
      res.json(items);
    }
  });

  router.get('/public/:id', async (req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('artikel')
        .select('*')
        .eq('id', req.params.id)
        .neq('visible', false)
        .or(`status.eq.published,and(status.eq.scheduled,publishAt.lte.${now})`)
        .single();
      if (error) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } else {
      const item = await fallbackCol.findOne({
        id: req.params.id,
        visible: { $ne: false },
        $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
      });
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    }
  });

  router.get('/', authMiddleware, async (_req, res) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('artikel')
        .select('*')
        .order('updatedAt', { ascending: false });
      if (error) {
        console.error('GET / error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      const mapped = data.map(d => ({ ...d, _id: d.id }));
      return res.json(mapped);
    } else {
      const items = await fallbackCol.find().sort({ updatedAt: -1, createdAt: -1, date: -1 }).toArray();
      res.json(items);
    }
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

    if (supabase) {
      delete data._id;
      const { data: inserted, error } = await supabase
        .from('artikel')
        .insert([data])
        .select()
        .single();
        
      if (error) {
        console.error('POST / error:', error);
        return res.status(500).json({ error: error.message });
      }
      res.status(201).json({ ...inserted, _id: inserted.id });
    } else {
      if (data.publishAt) data.publishAt = new Date(data.publishAt);
      data.createdAt = new Date();
      data.updatedAt = new Date();
      const result = await fallbackCol.insertOne(data);
      res.status(201).json({ ...data, _id: result.insertedId });
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const { _id, ...data } = req.body;
    data.updatedAt = new Date().toISOString();
    data.visible = data.visible !== false;
    
    if (data.publishAt === '') data.publishAt = null;
    
    const enabled = await isSectionEnabled(db, 'writings');

    if (supabase) {
      const { data: existing, error: findError } = await supabase
        .from('artikel')
        .select('*')
        .eq('id', req.params.id)
        .single();
        
      if (findError || !existing) return res.status(404).json({ error: 'Not found' });

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

      const { error } = await supabase
        .from('artikel')
        .update(data)
        .eq('id', req.params.id);
        
      if (error) {
        console.error('PUT /:id error:', error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ message: 'Updated' });
    } else {
      res.status(500).json({ error: 'Supabase required for this operation' });
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

      queueAutosave('writings', req.params.id, $setDoc);
      res.json({ message: 'Queued for autosave' });
    } catch (err) {
      console.error('[autosave] PATCH /writings/:id failed:', err);
      res.status(500).json({ error: 'Autosave queueing failed' });
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    if (supabase) {
      const { error } = await supabase
        .from('writings')
        .delete()
        .eq('id', req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ message: 'Deleted' });
    } else {
      res.status(500).json({ error: 'Supabase required' });
    }
  });

  return router;
}
