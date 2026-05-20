import { MongoClient } from 'mongodb';

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('alphonsus-portfolio');
    
    const categories = await db.collection('categories').find({}).toArray();
    console.log('--- CATEGORIES ---');
    console.log(JSON.stringify(categories, null, 2));

    const writings = await db.collection('writings').find({}).toArray();
    console.log('\n--- WRITINGS CATEGORIES ---');
    writings.forEach(w => {
      console.log(`id: ${w.id}, category: ${w.category}, title: ${JSON.stringify(w.title)}`);
    });

    const projects = await db.collection('projects').find({}).toArray();
    console.log('\n--- PROJECTS CATEGORIES ---');
    projects.forEach(p => {
      console.log(`id: ${p.id}, category: ${p.category}, title: ${JSON.stringify(p.title)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();

