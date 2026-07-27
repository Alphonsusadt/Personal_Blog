/**
 * Pulihkan cadangan yang dibuat backup.mjs.
 *
 * Aman secara bawaan: tanpa --apply hanya menampilkan rencana (dry-run), dan
 * koleksi yang sudah berisi data TIDAK akan disentuh kecuali diminta tegas.
 *
 *   npm run restore -- --from <folder>                    → dry-run
 *   npm run restore -- --from <folder> --apply            → pulihkan koleksi kosong saja
 *   npm run restore -- --from <folder> --apply --overwrite→ timpa juga yang sudah berisi
 *   ... --only writings,projects                          → batasi koleksinya
 *   ... --db nama-lain                                    → pulihkan ke database lain (uji coba)
 */
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const from = arg('from');
const APPLY = has('apply');
const OVERWRITE = has('overwrite');
const only = arg('only') ? arg('only').split(',').map(s => s.trim()) : null;
const DB_NAME = arg('db', process.env.MONGODB_DB_NAME || 'alphonsus-portfolio');

if (!from) {
  console.error('Wajib: --from <folder cadangan>');
  process.exit(1);
}

const manifest = JSON.parse(await fs.readFile(path.join(from, 'manifest.json'), 'utf8'));
console.log(`Cadangan  : ${manifest.createdAt} (db asal: ${manifest.database})`);
console.log(`Tujuan    : ${DB_NAME}`);
console.log(`Mode      : ${APPLY ? (OVERWRITE ? 'APPLY + OVERWRITE' : 'APPLY (hanya koleksi kosong)') : 'DRY-RUN'}\n`);

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(DB_NAME);

let restored = 0;
for (const [name, count] of Object.entries(manifest.collections)) {
  if (only && !only.includes(name)) continue;

  const col = db.collection(name);
  const existing = await col.countDocuments();

  if (existing > 0 && !OVERWRITE) {
    console.log(`  SKIP      ${name.padEnd(12)} sudah berisi ${existing} dokumen (pakai --overwrite untuk menimpa)`);
    continue;
  }

  const docs = EJSON.parse(await fs.readFile(path.join(from, `${name}.json`), 'utf8'));
  console.log(`  ${APPLY ? 'PULIHKAN ' : 'DRY      '} ${name.padEnd(12)} ${docs.length} dokumen${existing > 0 ? ` (menimpa ${existing})` : ''}`);

  if (APPLY && docs.length > 0) {
    // Upsert per _id: dokumen yang sudah ada diperbarui, sisanya ditambahkan.
    // Tidak memakai drop() supaya index dan koleksi lain tetap utuh.
    const ops = docs.map(d => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    }));
    const res = await col.bulkWrite(ops, { ordered: false });
    restored += (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }
  if (!APPLY) restored += docs.length;
  if (count !== docs.length) console.warn(`     ⚠️ manifest bilang ${count}, berkas berisi ${docs.length}`);
}

await client.close();
console.log(`\n${APPLY ? '✅ Dipulihkan' : 'Akan dipulihkan'}: ${restored} dokumen`);
if (!APPLY) console.log('   Tambahkan --apply untuk benar-benar menulis.');
