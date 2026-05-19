import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = '662888372166572';
const apiSecret = 'lCwksZaYYHzkPlr4M9U2ho3un2s';

const candidates = [
  'root',
  'alphonsus',
  'alphonsusadt',
  'alphonsus-portfolio',
  'personal-blog',
  'aditp',
  'portfolio',
  'blog',
];

async function testName(name) {
  try {
    cloudinary.config({
      cloud_name: name,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    
    // Attempt ping
    const res = await cloudinary.api.ping();
    console.log(`✅ SUCCESS for cloud_name: "${name}"! Result:`, res);
    return true;
  } catch (err) {
    if (err?.error?.message && err.error.message.includes('cloud_name mismatch')) {
      console.log(`❌ Mismatch for: "${name}"`);
    } else {
      console.log(`⚠️ Other error for "${name}":`, err.message || err);
    }
    return false;
  }
}

async function run() {
  console.log('Testing candidates...');
  for (const name of candidates) {
    const ok = await testName(name);
    if (ok) {
      console.log(`\n🎉 FOUND THE CORRECT CLOUD NAME: "${name}"`);
      process.exit(0);
    }
  }
  console.log('\nNone of the direct candidates succeeded.');
}

run();
