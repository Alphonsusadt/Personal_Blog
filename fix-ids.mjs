import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function fix() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('alphonsus-portfolio');
  
  console.log('=== Fixing WRITINGS ===');
  const writings = db.collection('writings');
  const noIdWritings = await writings.find({$or: [{id: {$exists: false}}, {id: ''}]}).toArray();
  console.log('Items without valid ID:', noIdWritings.length);
  for(const item of noIdWritings) {
    const title = item.title || 'untitled';
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    console.log('  Fixing:', item._id, '=>', id);
    await writings.updateOne({_id: item._id}, {$set: {id}});
  }
  
  console.log('\n=== Fixing PROJECTS ===');
  const projects = db.collection('projects');
  const noIdProjects = await projects.find({$or: [{id: {$exists: false}}, {id: ''}]}).toArray();
  console.log('Items without valid ID:', noIdProjects.length);
  for(const item of noIdProjects) {
    const title = item.title || 'untitled';
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    console.log('  Fixing:', item._id, '=>', id);
    await projects.updateOne({_id: item._id}, {$set: {id}});
  }
  
  console.log('\n=== Fixing BOOKS ===');
  const books = db.collection('books');
  const noIdBooks = await books.find({$or: [{id: {$exists: false}}, {id: ''}]}).toArray();
  console.log('Items without valid ID:', noIdBooks.length);
  for(const item of noIdBooks) {
    const title = item.title || 'untitled';
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    console.log('  Fixing:', item._id, '=>', id);
    await books.updateOne({_id: item._id}, {$set: {id}});
  }
  
  console.log('\n✅ All items fixed!');
  await client.close();
}

fix().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
