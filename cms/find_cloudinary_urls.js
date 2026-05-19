import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

async function findCloudinary() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db(DB_NAME);
  
  // Search in all collections
  const collections = ['writings', 'projects', 'books', 'media'];
  
  for (const collName of collections) {
    const coll = db.collection(collName);
    const docs = await coll.find({}).toArray();
    console.log(`Checking ${docs.length} documents in "${collName}"...`);
    
    for (const doc of docs) {
      const docStr = JSON.stringify(doc);
      if (docStr.includes('cloudinary.com')) {
        console.log(`FOUND CLOUDINARY URL in ${collName} (ID: ${doc._id || doc.id}):`);
        // Find URLs in string
        const regex = /https?:\/\/[^\s"'`()]+cloudinary\.com[^\s"'`()]+/g;
        const matches = docStr.match(regex);
        if (matches) {
          console.log('URLs:', matches);
        } else {
          console.log('Raw doc snippet:', docStr.slice(0, 500));
        }
      }
    }
  }

  await client.close();
}

findCloudinary().catch(console.error);
