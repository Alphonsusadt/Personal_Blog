import { MongoClient, ObjectId } from 'mongodb';

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('alphonsus-portfolio');
    
    const collections = ['writings', 'projects', 'books'];
    
    for (const colName of collections) {
      console.log(`\n=== Cleaning ${colName.toUpperCase()} ===`);
      const col = db.collection(colName);
      const docs = await col.find({}).toArray();
      
      // Group by slug 'id'
      const groups = {};
      docs.forEach(doc => {
        const idKey = doc.id ? String(doc.id).trim() : '';
        if (!groups[idKey]) {
          groups[idKey] = [];
        }
        groups[idKey].push(doc);
      });
      
      for (const [idKey, groupDocs] of Object.entries(groups)) {
        if (idKey === '') {
          // Empty/null slug handling:
          // Delete abandoned blank drafts, keep the latest one if it has content
          console.log(`Found ${groupDocs.length} documents with empty/null slug.`);
          
          // Sort by updatedAt descending
          groupDocs.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          });
          
          for (let i = 0; i < groupDocs.length; i++) {
            const doc = groupDocs[i];
            const hasTitle = doc.title && (
              (typeof doc.title === 'string' && doc.title.trim().length > 0) ||
              (typeof doc.title === 'object' && (
                (doc.title.en && doc.title.en.trim().length > 0) ||
                (doc.title.id && doc.title.id.trim().length > 0)
              ))
            );
            
            // Keep the latest one if it has a title/content, otherwise delete
            if (i === 0 && hasTitle) {
              console.log(`  Keeping latest empty-slug doc with content: _id = ${doc._id}`);
            } else {
              console.log(`  Deleting empty-slug doc: _id = ${doc._id}`);
              await col.deleteOne({ _id: doc._id });
            }
          }
          continue;
        }
        
        if (groupDocs.length > 1) {
          console.log(`Found duplicate slug '${idKey}' with ${groupDocs.length} entries.`);
          
          // Sort by updatedAt / createdAt / _id descending (newest first)
          groupDocs.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            // Fallback to ObjectId generation time
            return b._id.getTimestamp().getTime() - a._id.getTimestamp().getTime();
          });
          
          const keepDoc = groupDocs[0];
          console.log(`  Keeping newest: _id = ${keepDoc._id}, title = ${JSON.stringify(keepDoc.title)}, updatedAt = ${keepDoc.updatedAt}`);
          
          for (let i = 1; i < groupDocs.length; i++) {
            const deleteDoc = groupDocs[i];
            console.log(`  Deleting duplicate: _id = ${deleteDoc._id}, title = ${JSON.stringify(deleteDoc.title)}, updatedAt = ${deleteDoc.updatedAt}`);
            await col.deleteOne({ _id: deleteDoc._id });
          }
        }
      }
    }
    
    console.log('\nDatabase cleanup finished successfully.');
  } catch (err) {
    console.error('Error cleaning database duplicates:', err);
  } finally {
    await client.close();
  }
}

run();
