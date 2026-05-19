import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log('Loading Cloudinary configuration...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Loaded' : 'Missing');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Loaded' : 'Missing');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function runTest() {
  try {
    console.log('Testing Cloudinary connection by fetching resources...');
    const result = await cloudinary.api.ping();
    console.log('Cloudinary Ping Result:', result);
  } catch (err) {
    console.error('Cloudinary API connection error:', err);
  }
}

runTest();
