/**
 * Data Synchronization Utility
 * Ensures data stays in sync between MongoDB and Supabase
 */

import { ObjectId } from 'mongodb';
import { supabase } from '../config/supabase.js';

const STRIP_FIELDS = ['translationOfId', 'contentLanguage'];

function stripForSupabase(tableName, data) {
  const cleaned = { ...data };
  for (const field of STRIP_FIELDS) {
    delete cleaned[field];
  }
  // Strip devStatus if not projects table (writings, books) to avoid schema errors on Supabase
  if (tableName !== 'projects') {
    delete cleaned.devStatus;
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
    
    // Determine the query filter for upsert
    let query = {};
    const rawId = data._id || id;
    
    if (rawId) {
      const isObjectId = (rawId instanceof ObjectId) || 
                         (typeof rawId === 'string' && rawId.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawId));
      
      if (isObjectId) {
        query = { _id: typeof rawId === 'string' ? new ObjectId(rawId) : rawId };
      } else {
        query = { id: String(rawId) };
      }
    }

    // Strip _id from $set document since _id is immutable in MongoDB
    const { _id, ...cleanData } = data;

    if (Object.keys(query).length > 0) {
      const result = await col.updateOne(
        query,
        { $set: { ...cleanData, updatedAt: new Date() } },
        { upsert: true }
      );
      return { success: true, result };
    } else {
      // Insert new
      const result = await col.insertOne({ ...cleanData, createdAt: new Date(), updatedAt: new Date() });
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
    const cleaned = stripForSupabase(tableName, data);
    const targetId = cleaned.id || id;
    let result = null;

    if (targetId) {
      // Query first to check if the writing/record exists
      const { data: existing, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', targetId)
        .maybeSingle();

      if (checkError) {
        console.warn(`[Sync] Check failed in Supabase for ${tableName}/${targetId}:`, checkError.message);
      }

      if (existing) {
        // Update existing record
        const { data: updateRes, error: updateError } = await supabase
          .from(tableName)
          .update(cleaned)
          .eq('id', targetId)
          .select()
          .maybeSingle();
        
        if (updateError) throw updateError;
        result = updateRes;
      } else {
        // Insert new record
        const { data: insertRes, error: insertError } = await supabase
          .from(tableName)
          .insert([cleaned])
          .select()
          .maybeSingle();
        
        if (insertError) throw insertError;
        result = insertRes;
      }
    } else {
      // If no id can be resolved, insert
      const { data: insertRes, error: insertError } = await supabase
        .from(tableName)
        .insert([cleaned])
        .select()
        .maybeSingle();
      
      if (insertError) throw insertError;
      result = insertRes;
    }

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

  // Optimize: Sync to Supabase in the background asynchronously so the client request finishes instantly
  if (supabaseTable) {
    upsertSupabase(supabaseTable, id, data)
      .then((supabaseResult) => {
        if (!supabaseResult.success) {
          console.warn(`[Sync] ⚠️ Supabase background sync failed for ${supabaseTable}`);
        }
      })
      .catch((err) => {
        console.error(`[Sync] ❌ Supabase background sync error for ${supabaseTable}:`, err.message);
      });
  }

  if (!mongoResult.success) {
    console.error(`[Sync] ❌ MongoDB failed for ${collection}:`, mongoResult.error);
  }

  return {
    success: mongoResult.success,
    mongo: mongoResult.success,
    supabase: true, // Non-blocking assumed success to prevent blocking response
    data: mongoResult.result
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
        const cleaned = stripForSupabase(supabaseTable, item);
        const targetId = cleaned.id || item.id;
        let syncError = null;

        if (targetId) {
          // Check if exists
          const { data: existing, error: checkError } = await supabase
            .from(supabaseTable)
            .select('id')
            .eq('id', targetId)
            .maybeSingle();

          if (checkError) {
            syncError = checkError;
          } else if (existing) {
            // Update
            const { error: updateError } = await supabase
              .from(supabaseTable)
              .update(cleaned)
              .eq('id', targetId);
            syncError = updateError;
          } else {
            // Insert
            const { error: insertError } = await supabase
              .from(supabaseTable)
              .insert([cleaned]);
            syncError = insertError;
          }
        } else {
          // Just insert
          const { error: insertError } = await supabase
            .from(supabaseTable)
            .insert([cleaned]);
          syncError = insertError;
        }

        if (syncError) {
          console.error(`  ❌ Failed to sync ${item.id || item._id}:`, syncError.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error syncing ${item.id || item._id}:`, error.message);
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
