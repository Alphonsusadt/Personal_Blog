import { parentPort, workerData } from 'worker_threads';
import { MongoClient, ObjectId } from 'mongodb';

const { MONGODB_URI, DB_NAME } = workerData;

let client;
let db;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
  }
  return db;
}

connectDB().catch(err => {
  console.error('[dbWorker] Initial connection failed:', err);
});

parentPort.on('message', async (message) => {
  if (message.type === 'AUTOSAVE') {
    const { collectionName, documentId, $setDoc, jobId } = message.payload;
    
    try {
      const database = await connectDB();
      const col = database.collection(collectionName);
      
      // Only convert to ObjectId if it's a valid hex string of 24 chars, else use as string
      let targetId;
      if (documentId.length === 24 && /^[0-9a-fA-F]{24}$/.test(documentId)) {
        targetId = new ObjectId(documentId);
      } else {
        targetId = documentId;
      }

      // 1. Save to MongoDB (Primary Source of Truth).
      // `status: { $ne: 'deleted' }` wajib: autosave yang tertunda (debounce/retry)
      // bisa mendarat SETELAH konten dihapus dan dulu menulis balik status
      // draft/published ke tombstone-nya — konten jadi hilang dari Trash tapi tetap
      // tampil di Dashboard & situs publik (lewat fallback Mongo).
      const result = await col.updateOne(
        { _id: targetId, status: { $ne: 'deleted' } },
        { $set: $setDoc }
      );

      // 2. Dual-write/sync to Supabase in background if it's writings
      if (collectionName === 'writings' && result.matchedCount > 0) {
        try {
          const { supabase } = await import('../config/supabase.js');
          if (supabase) {
            const { _id, _clientVersion, translationOfId, contentLanguage, supabaseId, ...updateFields } = $setDoc;

            // Kolom `_id` di Supabase berisi UUID. Kalau documentId bukan UUID (mis.
            // ObjectId Mongo), upsert lama TIDAK ketemu baris mana pun lalu menyisipkan
            // baris baru — sumber utama Mongo & Supabase jadi menyimpang. Karena itu:
            // selalu UPDATE (tidak pernah insert) dan alamatkan barisnya secara eksplisit.
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(documentId);
            let query = null;

            if (isUuid) {
              query = supabase.from('artikel').update(updateFields).eq('_id', documentId);
            } else {
              const doc = await col.findOne({ _id: targetId }, { projection: { id: 1 } });
              const slug = (doc?.id || '').trim();
              // Jangan pernah .eq('id', '') — baris legacy berslug kosong akan kena semua.
              if (slug) query = supabase.from('artikel').update(updateFields).eq('id', slug);
            }

            if (query) {
              // Baris yang sudah dihapus di Supabase tidak boleh dihidupkan lagi.
              const { error } = await query.neq('status', 'deleted');
              if (error) {
                console.warn('[dbWorker] Supabase background update failed:', error.message);
              }
            } else {
              console.warn(`[dbWorker] Lewati sync Supabase: tidak ada kunci baris yang aman untuk ${documentId}`);
            }
          }
        } catch (supaErr) {
          console.warn('[dbWorker] Supabase background error:', supaErr.message);
        }
      }
      
      parentPort.postMessage({
        type: 'AUTOSAVE_SUCCESS',
        payload: {
          jobId,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount
        }
      });
    } catch (err) {
      console.error(`[dbWorker] Error updating ${collectionName}/${documentId}:`, err);
      parentPort.postMessage({
        type: 'AUTOSAVE_ERROR',
        payload: { jobId, error: err.message }
      });
    }
  } else if (message.type === 'SHUTDOWN') {
    if (client) {
      await client.close();
    }
    process.exit(0);
  }
});
