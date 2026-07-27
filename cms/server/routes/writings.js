import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { queueAutosave } from '../utils/autosaveQueue.js';
import { dualWrite, syncMongoToSupabase } from '../utils/dataSync.js';
import { isSectionEnabled } from '../utils/settingsCache.js';

// SUMBER KEBENARAN: MongoDB — untuk writings, sama seperti projects & books.
//
// Dulu endpoint baca di berkas ini mengambil dari Supabase lebih dulu dengan Mongo
// sebagai cadangan. Dua penyimpanan yang sama-sama berwenang bisa berbeda isi, dan
// itulah sumber rentetan bug: tulisan terhapus tetap tampil di situs, Trash kosong
// padahal ada yang dihapus, dan tulisan baru yang gagal masuk Supabase lenyap dari
// daftar CMS. Sesuai rancangan awal di README, Supabase adalah CADANGAN: ditulis
// (lihat dualWrite), tidak pernah dibaca aplikasi.

// Helper: Safely parse JSON string back to object.
// Dokumen lama bisa menyimpan title/excerpt/content sebagai STRING JSON, jadi tetap
// dinormalkan walaupun sumbernya sekarang Mongo.
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
  // Nama 'fallbackCol' sudah tidak tepat: Mongo bukan lagi cadangan, tapi sumbernya.
  const writingsCol = db.collection('writings');

  router.get('/public', async (_req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.json([]);

    const items = await writingsCol.find({
      visible: { $ne: false },
      $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
    }).sort({ createdAt: -1, date: -1 }).toArray();

    res.json(items.map(parseSupabaseJson));
  });

  router.get('/public/:id', async (req, res) => {
    const enabled = await isSectionEnabled(db, 'writings');
    if (!enabled) return res.status(404).json({ error: 'Not found' });

    const item = await writingsCol.findOne({
      id: req.params.id,
      visible: { $ne: false },
      $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
    });

    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(parseSupabaseJson(item));
  });

  router.get('/', authMiddleware, async (_req, res) => {
    const items = await writingsCol
      .find({ status: { $ne: 'deleted' } })
      .sort({ updatedAt: -1, createdAt: -1, date: -1 })
      .toArray();
    const result = items.map(d => parseSupabaseJson({ ...d, _id: d._id }));

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
        const existing = await writingsCol.findOne({ id: data.id });
        if (existing) {
          if (data.id.includes('-draft-') || existing.status === 'draft') {
            // Re-use existing document and update it to maintain idempotency and prevent duplicates
            const syncResult = await dualWrite(db, 'writings', 'artikel', existing._id.toString(), data);
            if (!syncResult.success) {
              return res.status(500).json({ error: 'Failed to save data' });
            }
            // NOTE: tidak ada queueAutosave di sini — dualWrite sudah menulis ke
            // Mongo + Supabase. Antrian autosave menerima documentId dan dulu diberi
            // SLUG, bukan _id, sehingga worker meleset di Mongo dan malah menyisipkan
            // baris hantu baru di Supabase (lihat workers/dbWorker.js).
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

      // dualWrite sudah persist ke Mongo + Supabase; tidak perlu (dan tidak boleh)
      // mengantre autosave dengan slug sebagai documentId.
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
      // Daftar admin sekarang selalu mengirim ObjectId Mongo. UUID Supabase masih
      // ditangani demi tulisan lama yang sempat tersimpan hanya di Supabase.
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(lookupId);

      const mongoDoc = await writingsCol.findOne(isObjectId ? { _id: new ObjectId(lookupId) } : { id: lookupId });

      // Not (or not only) in Mongo — resolve the exact Supabase row via its _id column.
      // Many legacy Supabase rows have an EMPTY slug (id column), so the slug can
      // never be required for the lookup to succeed.
      let sbDoc = null;
      if (!mongoDoc && !isObjectId && supabase) {
        try {
          const { data } = await supabase.from('artikel').select('*').eq('_id', lookupId).maybeSingle();
          if (data) sbDoc = data;
        } catch (err) {
          console.warn('[writings] Supabase lookup by _id failed:', err.message);
        }
      }

      if (!mongoDoc && !sbDoc) {
        return res.status(404).json({ error: 'Writing not found' });
      }

      const sourceDoc = mongoDoc || parseSupabaseJson(sbDoc);
      // Stable key for the Mongo tombstone: prefer the real slug; legacy Supabase
      // rows with an empty slug fall back to the row's UUID so each gets its own doc.
      const slug = (mongoDoc?.id || sbDoc?.id || '').trim() || lookupId;

      const updateData = {
        ...sourceDoc,
        id: slug,
        status: 'deleted',
        visible: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };
      delete updateData._id;

      // Simpan UUID baris Supabase-nya. Tanpa ini, Trash hanya bisa mengalamatkan
      // baris lewat slug — dan slug legacy sering kosong, sehingga purge/restore
      // meleset (atau menyapu semua baris berslug kosong sekaligus).
      const supabaseId = sbDoc?._id || (mongoDoc?.supabaseId ?? null);
      if (supabaseId) updateData.supabaseId = supabaseId;

      // 1. Soft-delete in MongoDB (upsert a tombstone if the doc only lived in
      // Supabase) so the item shows up in the Trash Bin and can be restored.
      if (mongoDoc) {
        await writingsCol.updateOne({ _id: mongoDoc._id }, { $set: updateData });
      } else {
        await writingsCol.updateOne({ id: slug }, { $set: updateData }, { upsert: true });
      }

      // 2. Teruskan soft-delete ke cadangan Supabase. Sejak Mongo jadi sumber
      // kebenaran, kegagalan di sini TIDAK lagi menggagalkan penghapusan — bagi
      // pengguna kontennya memang sudah terhapus. Cukup dicatat agar terlihat kalau
      // cadangannya tertinggal. Alamatkan baris lewat _id bila ada; jangan pernah
      // mencocokkan slug kosong — .eq('id','') akan mengenai semua baris legacy.
      if (supabase) {
        let query = supabase.from('artikel').update({ status: 'deleted', visible: false });
        if (!isObjectId) {
          query = query.eq('_id', lookupId);
        } else if ((mongoDoc?.id || '').trim()) {
          query = query.eq('id', mongoDoc.id);
        } else {
          query = null; // no safe way to address the Supabase row; Mongo is already updated
        }
        if (query) {
          const { error: sbErr } = await query;
          if (sbErr) {
            console.warn('[writings] Cadangan Supabase gagal ditandai deleted:', sbErr.message);
          }
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
