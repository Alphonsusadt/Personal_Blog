/**
 * Data Synchronization Utility
 * Ensures data stays in sync between MongoDB and Supabase
 */

import { ObjectId } from 'mongodb';
import { supabase } from '../config/supabase.js';

// `supabaseId` adalah kolom bantu khusus Mongo (UUID baris Supabase) — jangan
// pernah ikut dikirim ke Supabase, tabelnya tidak punya kolom itu.
const STRIP_FIELDS = ['translationOfId', 'contentLanguage', 'supabaseId'];

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
 * Cermin satu arah MongoDB → Supabase (cadangan).
 *
 * Setelah sinkronisasi selesai, isi tabel Supabase HARUS sama persis dengan
 * koleksi Mongo-nya: baris yang tertinggal dibuat, yang berbeda diperbarui, dan
 * yang sudah tidak ada di Mongo dibuang. Cadangan yang menyimpan baris siluman
 * justru itulah yang selama ini menyesatkan.
 *
 * Baris dialamatkan lewat kolom `_id` (UUID) bila diketahui — slug tidak bisa
 * diandalkan karena baris legacy banyak yang slug-nya kosong. UUID hasil insert
 * disimpan balik ke dokumen Mongo sebagai `supabaseId` agar pencocokan
 * berikutnya selalu tepat.
 *
 * Kegagalan tidak dilempar, tapi DIKEMBALIKAN apa adanya — supaya pemanggilnya
 * bisa menampilkan "cadangan tertinggal" alih-alih diam-diam mengaku sukses.
 */
export async function syncMongoToSupabase(db, collection, supabaseTable) {
  if (!supabase) {
    return { success: false, error: 'Supabase tidak dikonfigurasi' };
  }

  const errors = [];
  let inserted = 0, updated = 0, pruned = 0;

  try {
    const col = db.collection(collection);
    const items = await col.find({}).toArray();

    const { data: rows, error: readErr } = await supabase.from(supabaseTable).select('_id,id');
    if (readErr) return { success: false, error: readErr.message };

    const rowById = new Map(rows.map(r => [String(r._id), r]));
    const rowBySlug = new Map(rows.filter(r => (r.id || '').trim()).map(r => [String(r.id), r]));
    const keep = new Set();

    for (const item of items) {
      const label = item.id || String(item._id);
      const cleaned = stripForSupabase(supabaseTable, item);
      const match = (item.supabaseId && rowById.get(String(item.supabaseId)))
        || ((item.id || '').trim() && rowBySlug.get(String(item.id)))
        || null;

      if (match) {
        keep.add(String(match._id));
        const { error } = await supabase.from(supabaseTable).update(cleaned).eq('_id', match._id);
        if (error) errors.push(`${label}: ${error.message}`);
        else updated++;
      } else {
        const { data: ins, error } = await supabase.from(supabaseTable).insert([cleaned]).select('_id').maybeSingle();
        if (error) {
          errors.push(`${label}: ${error.message}`);
        } else {
          inserted++;
          keep.add(String(ins._id));
          // Ingat UUID-nya supaya pencocokan berikutnya tidak bergantung pada slug.
          await col.updateOne({ _id: item._id }, { $set: { supabaseId: ins._id } });
        }
      }
    }

    // Buang baris yang sudah tidak punya padanan di Mongo. Pengaman: kalau Mongo
    // kosong, JANGAN memangkas — itu lebih mungkin salah konfigurasi daripada
    // perintah menghapus segalanya, dan cadangan tidak boleh ikut terhapus.
    if (items.length === 0) {
      if (rows.length > 0) errors.push(`Pemangkasan dilewati: Mongo kosong, ${rows.length} baris Supabase dibiarkan`);
    } else {
      for (const row of rows) {
        if (keep.has(String(row._id))) continue;
        const { error } = await supabase.from(supabaseTable).delete().eq('_id', row._id);
        if (error) errors.push(`prune ${row._id}: ${error.message}`);
        else pruned++;
      }
    }

    const success = errors.length === 0;
    console.log(`[Sync] ${collection} → ${supabaseTable}: +${inserted} ~${updated} -${pruned}${success ? '' : ` (${errors.length} gagal)`}`);
    return { success, inserted, updated, pruned, errors };
  } catch (error) {
    console.error('[Sync] Sync error:', error.message);
    return { success: false, inserted, updated, pruned, errors: [...errors, error.message] };
  }
}
