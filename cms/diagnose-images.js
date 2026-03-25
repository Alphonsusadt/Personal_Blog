/**
 * Diagnostic script to check image URLs in writings
 * Run with: node diagnose-images.js
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

async function diagnose() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB\n');

  const db = client.db(DB_NAME);
  const writings = await db.collection('writings').find({}).toArray();

  console.log(`Found ${writings.length} writings\n`);
  console.log('='.repeat(60));

  // Find all image references in content
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const base64Regex = /data:image\/[^;]+;base64,/;

  let totalImages = 0;
  let base64Images = 0;
  let urlImages = 0;
  let port5000Images = 0;
  let port5001Images = 0;

  for (const writing of writings) {
    const matches = [...(writing.content || '').matchAll(imageRegex)];

    if (matches.length > 0) {
      console.log(`\n📄 Writing: "${writing.title}" (id: ${writing.id})`);
      console.log('-'.repeat(40));

      for (const match of matches) {
        const [fullMatch, alt, url] = match;
        totalImages++;

        if (base64Regex.test(url)) {
          base64Images++;
          console.log(`  ⚠️  BASE64 image: [${alt}] (${url.slice(0, 50)}...)`);
        } else if (url.includes('localhost:5000')) {
          port5000Images++;
          console.log(`  ❌ WRONG PORT (5000): [${alt}] ${url}`);
        } else if (url.includes('localhost:5001')) {
          port5001Images++;
          console.log(`  ✅ Correct URL: [${alt}] ${url}`);
        } else {
          urlImages++;
          console.log(`  🔗 Other URL: [${alt}] ${url}`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`   Total images found: ${totalImages}`);
  console.log(`   Base64 images (need migration): ${base64Images}`);
  console.log(`   Port 5000 URLs (wrong, need fix): ${port5000Images}`);
  console.log(`   Port 5001 URLs (correct): ${port5001Images}`);
  console.log(`   Other URLs: ${urlImages}`);

  if (port5000Images > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Run the migration to fix port 5000 URLs');
  }
  if (base64Images > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Run base64 migration to upload images to server');
  }

  await client.close();
}

diagnose().catch(console.error);
