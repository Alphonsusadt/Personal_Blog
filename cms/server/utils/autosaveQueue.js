import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBOUNCE_MS = 2000;
const THROTTLE_MS = 30000;
const RETRY_DELAY_MS = 5000;

let worker = null;

// The RAM Queue: Map of jobId -> QueueItem
// jobId format: `${collectionName}_${documentId}`
const pendingUpdates = new Map();

export function initQueue(MONGODB_URI, DB_NAME) {
  const workerPath = path.join(__dirname, '../workers/dbWorker.js');
  
  worker = new Worker(workerPath, {
    workerData: { MONGODB_URI, DB_NAME }
  });

  worker.on('message', (msg) => {
    if (msg.type === 'AUTOSAVE_SUCCESS') {
      const { jobId } = msg.payload;
      const item = pendingUpdates.get(jobId);
      // If the item in the queue is currently marked as 'saving' (in-flight)
      // and no new changes were merged while it was saving, we can safely delete it.
      if (item && item.status === 'saving') {
        pendingUpdates.delete(jobId);
      }
    } else if (msg.type === 'AUTOSAVE_ERROR') {
      const { jobId, error } = msg.payload;
      console.error(`[autosaveQueue] Worker failed to save ${jobId}:`, error);
      
      const item = pendingUpdates.get(jobId);
      if (item && item.status === 'saving') {
        // Revert status to queued and retry later
        item.status = 'queued';
        clearTimeout(item.timeoutRef);
        item.timeoutRef = setTimeout(() => dispatchToWorker(jobId), RETRY_DELAY_MS);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('[autosaveQueue] Worker thread error:', err);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[autosaveQueue] Worker stopped with exit code ${code}`);
    }
  });

  console.log('[autosaveQueue] Worker Thread initialized');
}

function dispatchToWorker(jobId) {
  const item = pendingUpdates.get(jobId);
  if (!item || item.status === 'saving') return;

  // Mark as in-flight
  item.status = 'saving';
  
  // Create snapshot to send
  const payload = {
    jobId,
    collectionName: item.collectionName,
    documentId: item.documentId,
    $setDoc: { ...item.$setDoc }
  };

  worker.postMessage({
    type: 'AUTOSAVE',
    payload
  });
}

/**
 * Merges new fields into the RAM Queue and schedules a save to DB.
 * Guaranteed to return < 5ms.
 *
 * Field deletion: callers may set a field to `null` to signal that it
 * should be removed from the queued $setDoc so it won't be written to
 * the database as a literal null.
 */
export function queueAutosave(collectionName, documentId, newSetDoc) {
  if (!worker) {
    throw new Error('Autosave Queue not initialized. Call initQueue first.');
  }

  const jobId = `${collectionName}_${documentId}`;
  const now = Date.now();

  if (pendingUpdates.has(jobId)) {
    const item = pendingUpdates.get(jobId);
    
    // Merge fields — null values remove the key so stale data doesn't persist
    for (const [key, value] of Object.entries(newSetDoc)) {
      if (value === null || value === undefined) {
        delete item.$setDoc[key];
      } else {
        item.$setDoc[key] = value;
      }
    }
    item.lastUpdatedAt = now;

    // If it's already in-flight, the worker will finish the previous snapshot,
    // and we just keep this as 'queued' so it will get picked up later.
    if (item.status === 'saving') {
      item.status = 'queued';
    }

    clearTimeout(item.timeoutRef);

    // Throttle check: force dispatch if it's been waiting too long since first edit
    if (now - item.firstUpdatedAt >= THROTTLE_MS) {
      dispatchToWorker(jobId);
    } else {
      // Debounce: reset timer
      item.timeoutRef = setTimeout(() => dispatchToWorker(jobId), DEBOUNCE_MS);
    }
  } else {
    // New job — strip null/undefined keys up front
    const cleanedSetDoc = {};
    for (const [key, value] of Object.entries(newSetDoc)) {
      if (value !== null && value !== undefined) {
        cleanedSetDoc[key] = value;
      }
    }

    const timeoutRef = setTimeout(() => dispatchToWorker(jobId), DEBOUNCE_MS);
    
    pendingUpdates.set(jobId, {
      collectionName,
      documentId,
      $setDoc: cleanedSetDoc,
      firstUpdatedAt: now,
      lastUpdatedAt: now,
      status: 'queued', // 'queued' | 'saving'
      timeoutRef
    });
  }
}
