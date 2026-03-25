import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

async function updateStatus() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(DB_NAME);

  const r1 = await db.collection('projects').updateMany(
    {},
    { $set: { status: 'published' } }
  );
  console.log('Projects updated:', r1.modifiedCount);

  const r2 = await db.collection('writings').updateMany(
    {},
    { $set: { status: 'published' } }
  );
  console.log('Writings updated:', r2.modifiedCount);

  const r3 = await db.collection('books').updateMany(
    {},
    { $set: { status: 'published' } }
  );
  console.log('Books updated:', r3.modifiedCount);

  await client.close();
  console.log('All items set to published!');
}

updateStatus().catch(console.error);
