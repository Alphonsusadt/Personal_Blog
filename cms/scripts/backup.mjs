/**
 * Cadangan penuh MongoDB → berkas JSON.
 *
 * Mencadangkan SELURUH koleksi (writings, projects, books, messages, settings,
 * about, home, categories, media, users) — bukan hanya section yang kebetulan
 * punya tabel di Supabase.
 *
 * Format: Extended JSON, sehingga ObjectId dan Date tetap utuh dan hasilnya bisa
 * dipulihkan persis seperti aslinya oleh restore.mjs.
 *
 *   npm run backup                  → cms/backups/backup-<timestamp>/
 *   npm run backup -- --out D:\lain → tentukan folder tujuan sendiri
 */
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_NAME = process.env.MONGODB_DB_NAME || 'alphonsus-portfolio';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outRoot = arg('out', path.join(__dirname, '..', 'backups'));
const outDir = path.join(outRoot, `backup-${stamp}`);

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI belum diset di cms/.env');
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(DB_NAME);

await fs.mkdir(outDir, { recursive: true });

const collections = (await db.listCollections().toArray())
  .map(c => c.name)
  .filter(name => !name.startsWith('system.'))
  .sort();

const manifest = {
  createdAt: new Date().toISOString(),
  database: DB_NAME,
  collections: {},
};

let total = 0;
for (const name of collections) {
  const docs = await db.collection(name).find({}).toArray();
  await fs.writeFile(path.join(outDir, `${name}.json`), EJSON.stringify(docs, null, 2), 'utf8');
  manifest.collections[name] = docs.length;
  total += docs.length;
  console.log(`  ${name.padEnd(12)} ${String(docs.length).padStart(6)} dokumen`);
}

await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
await client.close();

console.log(`\n✅ ${total} dokumen dari ${collections.length} koleksi`);
console.log(`   ${outDir}`);
console.log(`\n   Pulihkan dengan:  npm run restore -- --from "${outDir}"`);
