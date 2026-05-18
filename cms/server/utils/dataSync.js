/**
 * Data Synchronization Utility
 * Ensures data stays in sync between MongoDB and Supabase
 */

import { supabase } from '../config/supabase.js';

const STRIP_FIELDS = ['translationOfId', 'contentLanguage'];

function stripForSupabase(data) {
  const cleaned = { ...data };
  for (const field of STRIP_FIELDS) {
    delete cleaned[field];
  }
  // Remove _id for insert operations
  delete cleaned._id;
  return cleaned;
}

/**
 * Upsert to MongoDB
 */
export async function upsertMongo(db, collection, id, data) {
  try {
    const col = db.collection(collection);
    
    if (data._id) {
      // Update by _id
      const result = await col.updateOne(
        { _id: data._id },
        { $set: { ...data, updatedAt: new Date() } },
        { upsert: true }
      );
      return { success: true, result };
    } else if (id) {
      // Update by id field (document id)
      const result = await col.updateOne(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { upsert: true }
      );
      return { success: true, result };
    } else {
      // Insert new
      const result = await col.insertOne({ ...data, createdAt: new Date(), updatedAt: new Date() });
      return { success: true, result };
    }
  } catch (error) {
    console.error(`[Sync] MongoDB ${collection} error:`, error.message);
    return { success: false, error };
  }
}

/**
 * Upsert to Supabase
 */
export async function upsertSupabase(tableName, id, data) {
  if (!supabase) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  try {
    const cleaned = stripForSupabase(data);

    // Use native Supabase upsert with conflict resolution on 'id' and maybeSingle()
    // to handle both inserts and updates safely, avoiding the fragile PGRST116 single() error.
    const { data: result, error } = await supabase
      .from(tableName)
      .upsert(cleaned, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) throw error;
    return { success: true, result };
  } catch (error) {
    console.error(`[Sync] Supabase ${tableName} error:`, error.message);
    return { success: false, error };
  }
}

/**
 * Dual-write: Update both MongoDB and Supabase
 * If one fails, log warning but still update the other
 */
export async function dualWrite(db, collection, supabaseTable, id, data) {
  const mongoResult = await upsertMongo(db, collection, id, data);
  const supabaseResult = await upsertSupabase(supabaseTable, id, data);

  if (!mongoResult.success) {
    console.error(`[Sync] ❌ MongoDB failed for ${collection}:`, mongoResult.error);
  }
  if (!supabaseResult.success) {
    console.warn(`[Sync] ⚠️ Supabase failed for ${supabaseTable} (data saved in MongoDB)`);
  }

  const success = mongoResult.success || supabaseResult.success;
  return {
    success,
    mongo: mongoResult.success,
    supabase: supabaseResult.success,
    data: mongoResult.result || supabaseResult.result
  };
}

/**
 * Delete from both databases
 */
export async function dualDelete(db, collection, supabaseTable, id) {
  try {
    const col = db.collection(collection);
    
    // Delete from MongoDB
    const mongoResult = await col.deleteOne({ id });
    
    // Delete from Supabase
    let supabaseResult = { success: true };
    if (supabase) {
      try {
        await supabase
          .from(supabaseTable)
          .delete()
          .eq('id', id);
      } catch (error) {
        console.warn(`[Sync] ⚠️ Supabase delete failed for ${supabaseTable}`, error.message);
        supabaseResult = { success: false, error };
      }
    }

    return {
      success: mongoResult.deletedCount > 0,
      deleted: mongoResult.deletedCount,
      supabaseDeleted: supabaseResult.success
    };
  } catch (error) {
    console.error(`[Sync] Delete error:`, error.message);
    return { success: false, error };
  }
}

/**
 * Sync all MongoDB data to Supabase (one-way backup)
 */
export async function syncMongoToSupabase(db, collection, supabaseTable) {
  if (!supabase) {
    console.warn('[Sync] Supabase not configured, skipping sync');
    return { success: false };
  }

  try {
    console.log(`[Sync] Starting sync: ${collection} → ${supabaseTable}...`);
    const col = db.collection(collection);
    const items = await col.find({}).toArray();

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const cleaned = stripForSupabase(item);
        
        // Upsert to Supabase
        const { error } = await supabase
          .from(supabaseTable)
          .upsert(cleaned)
          .select()
          .maybeSingle();

        if (error) {
          console.error(`  ❌ Failed to sync ${item.id}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error syncing ${item.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`[Sync] Complete: ✅ ${successCount} synced, ❌ ${errorCount} failed`);
    return { success: errorCount === 0, successCount, errorCount };
  } catch (error) {
    console.error(`[Sync] Sync error:`, error.message);
    return { success: false, error };
  }
}
