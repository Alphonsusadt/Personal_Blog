const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('alphonsus-portfolio');
  
  // Clean up corrupted titles
  const writings = await db.collection('writings').find({}).toArray();
  for (const w of writings) {
    if (w.title && typeof w.title === 'object') {
      let changed = false;
      if (typeof w.title.id === 'string' && w.title.id.includes('{"en":""')) {
        w.title.id = 'Tulisan Khusus Indonesia';
        changed = true;
      }
      if (typeof w.title.en === 'string' && w.title.en.includes('Test Bilingual')) {
        w.title.en = 'English Writing Test';
        changed = true;
      }
      if (changed) {
        await db.collection('writings').updateOne({ _id: w._id }, { $set: { title: w.title } });
        console.log('Fixed writing title:', w._id);
      }
    }
  }

  const projects = await db.collection('projects').find({}).toArray();
  for (const p of projects) {
    if (p.title && typeof p.title === 'object') {
      let changed = false;
      if (typeof p.title.id === 'string' && p.title.id.includes('{"en":""')) {
        p.title.id = 'Proyek Khusus Indonesia';
        changed = true;
      }
      if (typeof p.title.id === 'string' && p.title.id.includes('cerita haari ini')) {
        p.title.id = 'Cerita Hari Ini';
        changed = true;
      }
      if (changed) {
        await db.collection('projects').updateOne({ _id: p._id }, { $set: { title: p.title } });
        console.log('Fixed project title:', p._id);
      }
    }
  }

  await client.close();
}
run().catch(console.error);
