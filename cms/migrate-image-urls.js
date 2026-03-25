/**
 * Migration script to fix image URLs in writings
 * Fixes: port 5000 → port 5001
 * Run with: node migrate-image-urls.js
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

// What to fix
const FIXES = [
  { find: 'http://localhost:5000/uploads/', replace: 'http://localhost:5001/uploads/' },
  // Add more patterns here if needed
];

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB\n');

  const db = client.db(DB_NAME);
  const writingsCollection = db.collection('writings');

  // Get all writings
  const writings = await writingsCollection.find({}).toArray();
  console.log(`Found ${writings.length} writings to process\n`);

  let updatedCount = 0;

  for (const writing of writings) {
    let content = writing.content || '';
    let wasUpdated = false;

    for (const fix of FIXES) {
      if (content.includes(fix.find)) {
        content = content.split(fix.find).join(fix.replace);
        wasUpdated = true;
        console.log(`📝 "${writing.title}": Replacing ${fix.find} → ${fix.replace}`);
      }
    }

    if (wasUpdated) {
      await writingsCollection.updateOne(
        { _id: writing._id },
        { $set: { content } }
      );
      updatedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migration complete. Updated ${updatedCount} writings.`);

  // Also fix the media collection URLs
  const mediaCollection = db.collection('media');
  const mediaItems = await mediaCollection.find({}).toArray();
  let mediaUpdated = 0;

  for (const item of mediaItems) {
    let url = item.url || '';
    let wasUpdated = false;

    for (const fix of FIXES) {
      if (url.includes(fix.find)) {
        url = url.replace(fix.find, fix.replace);
        wasUpdated = true;
      }
    }

    if (wasUpdated) {
      await mediaCollection.updateOne(
        { _id: item._id },
        { $set: { url } }
      );
      mediaUpdated++;
    }
  }

  console.log(`✅ Also updated ${mediaUpdated} media records.`);

  await client.close();
}

migrate().catch(console.error);
