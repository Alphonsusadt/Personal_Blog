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

      // 1. Save to MongoDB (Primary Source of Truth)
      const result = await col.updateOne({ _id: targetId }, { $set: $setDoc });

      // 2. Dual-write/sync to Supabase in background if it's writings
      if (collectionName === 'writings') {
        try {
          const { supabase } = await import('../config/supabase.js');
          if (supabase) {
            const { _id, _clientVersion, translationOfId, contentLanguage, ...updateFields } = $setDoc;
            
            // Use native upsert with conflict resolution on '_id' to be highly resilient
            const { error } = await supabase
              .from('artikel')
              .upsert({ ...updateFields, _id: documentId }, { onConflict: '_id' });
            
            if (error) {
              console.warn('[dbWorker] Supabase background upsert failed:', error.message);
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
