import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { dualWrite } from '../utils/dataSync.js';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

// Helper to extract Cloudinary public IDs from any document (title, excerpt, content, cover, etc.)
function extractCloudinaryPublicIds(document) {
  const publicIds = [];
  const textContent = JSON.stringify(document);
  // Match Cloudinary upload URLs: res.cloudinary.com/cloud_name/image/upload/(v12345/)?public_id.ext
  const regex = /res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?([^.]+)\.[a-zA-Z0-9]+/g;
  
  let match;
  while ((match = regex.exec(textContent)) !== null) {
    if (match[1]) {
      // Decode URL component if there are spaces/special chars
      try {
        const decoded = decodeURIComponent(match[1]);
        publicIds.push(decoded);
      } catch (e) {
        publicIds.push(match[1]);
      }
    }
  }
  return [...new Set(publicIds)];
}

// Helper to destroy Cloudinary assets
async function deleteCloudinaryAssets(publicIds) {
  if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try {
      console.log(`[Trash] Deleting Cloudinary asset: ${publicId}`);
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`[Trash] Failed to delete Cloudinary asset ${publicId}:`, err.message || err);
    }
  }
}

// Background / Inline 30-day auto cleanup routine
export async function run30DayAutoCleanup(db) {
  try {
    const collections = ['projects', 'writings', 'books'];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    console.log(`[Trash Cleanup] Starting background 30-day auto-cleanup...`);
    
    for (const colName of collections) {
      const col = db.collection(colName);
      
      // Query items deleted more than 30 days ago
      // Note: for writings, deletedAt might be stored as string (ISO String)
      const query = {
        status: 'deleted',
        $or: [
          { deletedAt: { $lte: thirtyDaysAgo } },
          { deletedAt: { $lte: thirtyDaysAgo.toISOString() } }
        ]
      };
      
      const expiredItems = await col.find(query).toArray();
      if (expiredItems.length === 0) continue;
      
      console.log(`[Trash Cleanup] Found ${expiredItems.length} expired items in ${colName}. Purging...`);
      
      for (const item of expiredItems) {
        // 1. Extract and delete Cloudinary assets
        const publicIds = extractCloudinaryPublicIds(item);
        if (publicIds.length > 0) {
          await deleteCloudinaryAssets(publicIds);
        }
        
        // 2. Hard delete from MongoDB and Supabase
        if (colName === 'writings') {
          await col.deleteOne({ _id: item._id });
          if (supabase) {
            try {
              await supabase
                .from('artikel')
                .delete()
                .eq('id', item.id);
            } catch (err) {
              console.warn(`[Trash Cleanup] Supabase delete failed for artikel ${item.id}:`, err.message);
            }
          }
        } else {
          await col.deleteOne({ _id: item._id });
        }
        console.log(`[Trash Cleanup] Successfully purged expired ${colName} item: ${item.title?.en || item.title || item.id}`);
      }
    }

    // Messages use a different schema (`deleted` boolean flag, no `status` field, no Cloudinary assets)
    const messagesCol = db.collection('messages');
    const expiredMessages = await messagesCol.find({
      deleted: true,
      deletedAt: { $lte: thirtyDaysAgo }
    }).toArray();

    if (expiredMessages.length > 0) {
      console.log(`[Trash Cleanup] Found ${expiredMessages.length} expired messages. Purging...`);
      for (const msg of expiredMessages) {
        await messagesCol.deleteOne({ _id: msg._id });
        if (supabase) {
          try {
            await supabase.from('messages').delete().eq('original_message_id', msg.id);
          } catch (err) {
            console.warn(`[Trash Cleanup] Supabase delete failed for message ${msg.id}:`, err.message);
          }
        }
        console.log(`[Trash Cleanup] Successfully purged expired message: ${msg.subject || msg.id}`);
      }
    }
  } catch (err) {
    console.error(`[Trash Cleanup] Error in 30-day auto-cleanup:`, err);
  }
}

export default function trashRoutes(db) {
  const router = Router();

  // GET /api/trash: Fetch all soft-deleted items across Projects, Writings, and Books
  router.get('/', authMiddleware, async (req, res) => {
    try {
      // 1. Run 30-day auto-cleanup inline first to ensure stale data is never displayed
      await run30DayAutoCleanup(db);

      const items = [];

      // 2. Retrieve Projects
      const projects = await db.collection('projects').find({ status: 'deleted' }).toArray();
      projects.forEach(item => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const daysRemaining = Math.max(0, 30 - Math.ceil((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)));
        items.push({
          _id: item._id,
          id: item.id,
          title: item.title,
          type: 'project',
          deletedAt,
          daysRemaining
        });
      });

      // 3. Retrieve Writings
      const writings = await db.collection('writings').find({ status: 'deleted' }).toArray();
      writings.forEach(item => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const daysRemaining = Math.max(0, 30 - Math.ceil((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)));
        items.push({
          _id: item._id,
          id: item.id,
          title: item.title,
          type: 'writing',
          deletedAt,
          daysRemaining
        });
      });

      // 4. Retrieve Books
      const books = await db.collection('books').find({ status: 'deleted' }).toArray();
      books.forEach(item => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const daysRemaining = Math.max(0, 30 - Math.ceil((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)));
        items.push({
          _id: item._id,
          id: item.id,
          title: item.title,
          type: 'book',
          deletedAt,
          daysRemaining
        });
      });

      // 5. Retrieve Messages
      const messages = await db.collection('messages').find({ deleted: true }).toArray();
      messages.forEach(item => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const daysRemaining = Math.max(0, 30 - Math.ceil((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)));
        items.push({
          _id: item._id,
          id: item.id,
          title: item.subject,
          type: 'message',
          deletedAt,
          daysRemaining
        });
      });

      // Sort by deletion date desc
      items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
      res.json(items);
    } catch (err) {
      console.error('GET /api/trash error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/trash/restore/:type/:id: Restore a soft-deleted item back to active as 'draft'
  router.post('/restore/:type/:id', authMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      const mongoId = new ObjectId(id);

      if (type === 'project') {
        const col = db.collection('projects');
        const result = await col.updateOne(
          { _id: mongoId },
          { $set: { status: 'draft', visible: false }, $unset: { deletedAt: "" } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Project not found' });
      } else if (type === 'writing') {
        // Writing has dual write logic
        const col = db.collection('writings');
        const existing = await col.findOne({ _id: mongoId });
        if (!existing) return res.status(404).json({ error: 'Writing not found' });

        const restoreData = {
          ...existing,
          status: 'draft',
          visible: false,
          deletedAt: null
        };

        const syncResult = await dualWrite(db, 'writings', 'artikel', existing.id, restoreData);
        if (!syncResult.success) {
          return res.status(500).json({ error: 'Failed to restore writing' });
        }
      } else if (type === 'book') {
        const col = db.collection('books');
        const result = await col.updateOne(
          { _id: mongoId },
          { $set: { status: 'draft', visible: false }, $unset: { deletedAt: "" } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Book not found' });
      } else if (type === 'message') {
        const col = db.collection('messages');
        const result = await col.updateOne(
          { _id: mongoId },
          { $unset: { deleted: "", deletedAt: "" } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Message not found' });
      } else {
        return res.status(400).json({ error: 'Invalid content type' });
      }

      res.json({ message: 'Successfully restored content as draft' });
    } catch (err) {
      console.error('POST /api/trash/restore error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/trash/permanent/:type/:id: Permanently purge an item from DB, Supabase, and Cloudinary
  router.delete('/permanent/:type/:id', authMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      const mongoId = new ObjectId(id);

      let item = null;
      if (type === 'project') {
        const col = db.collection('projects');
        item = await col.findOne({ _id: mongoId });
        if (!item) return res.status(404).json({ error: 'Project not found' });

        // Extract and purge Cloudinary images
        const publicIds = extractCloudinaryPublicIds(item);
        await deleteCloudinaryAssets(publicIds);

        // Permanent delete from MongoDB
        await col.deleteOne({ _id: mongoId });
      } else if (type === 'writing') {
        const col = db.collection('writings');
        item = await col.findOne({ _id: mongoId });
        if (!item) return res.status(404).json({ error: 'Writing not found' });

        // Extract and purge Cloudinary images
        const publicIds = extractCloudinaryPublicIds(item);
        await deleteCloudinaryAssets(publicIds);

        // Hard delete from MongoDB and Supabase
        await col.deleteOne({ _id: mongoId });
        if (supabase) {
          try {
            await supabase
              .from('artikel')
              .delete()
              .eq('id', item.id);
          } catch (err) {
            console.warn(`[Trash] Supabase permanent delete failed for artikel ${item.id}:`, err.message);
          }
        }
      } else if (type === 'book') {
        const col = db.collection('books');
        item = await col.findOne({ _id: mongoId });
        if (!item) return res.status(404).json({ error: 'Book not found' });

        // Extract and purge Cloudinary images
        const publicIds = extractCloudinaryPublicIds(item);
        await deleteCloudinaryAssets(publicIds);

        // Permanent delete from MongoDB
        await col.deleteOne({ _id: mongoId });
      } else if (type === 'message') {
        const col = db.collection('messages');
        item = await col.findOne({ _id: mongoId });
        if (!item) return res.status(404).json({ error: 'Message not found' });

        await col.deleteOne({ _id: mongoId });
        if (supabase) {
          try {
            await supabase.from('messages').delete().eq('original_message_id', item.id);
          } catch (err) {
            console.warn(`[Trash] Supabase permanent delete failed for message ${item.id}:`, err.message);
          }
        }
      } else {
        return res.status(400).json({ error: 'Invalid content type' });
      }

      res.json({ message: 'Item and its cloud assets successfully purged permanently' });
    } catch (err) {
      console.error('DELETE /api/trash/permanent error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/trash/empty: Manually purge all soft-deleted items across all collections
  router.delete('/empty', authMiddleware, async (req, res) => {
    try {
      const collections = ['projects', 'writings', 'books'];
      let totalPurged = 0;

      for (const colName of collections) {
        const col = db.collection(colName);
        const deletedItems = await col.find({ status: 'deleted' }).toArray();
        
        for (const item of deletedItems) {
          const publicIds = extractCloudinaryPublicIds(item);
          await deleteCloudinaryAssets(publicIds);
          
          const itemId = item._id.toString();
          if (colName === 'writings') {
            await col.deleteOne({ _id: item._id });
            if (supabase) {
              try {
                await supabase
                  .from('artikel')
                  .delete()
                  .eq('id', item.id);
              } catch (err) {
                console.warn(`[Trash Empty] Supabase delete failed for artikel ${item.id}:`, err.message);
              }
            }
          } else {
            await col.deleteOne({ _id: item._id });
          }
          totalPurged++;
        }
      }

      // Purge deleted messages too (different schema: `deleted` boolean flag, not `status`)
      const messagesCol = db.collection('messages');
      const deletedMessages = await messagesCol.find({ deleted: true }).toArray();
      for (const msg of deletedMessages) {
        await messagesCol.deleteOne({ _id: msg._id });
        if (supabase) {
          try {
            await supabase.from('messages').delete().eq('original_message_id', msg.id);
          } catch (err) {
            console.warn(`[Trash Empty] Supabase delete failed for message ${msg.id}:`, err.message);
          }
        }
        totalPurged++;
      }

      res.json({ message: `Trash bin successfully emptied. Purged ${totalPurged} items.` });
    } catch (err) {
      console.error('DELETE /api/trash/empty error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
