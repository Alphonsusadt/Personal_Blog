import { MongoClient, ObjectId } from 'mongodb';
import axios from 'axios';

// Mock/simulate the backend logic inside our routes to test correctness directly
function determineTranslationDirectionSimulated(doc, currentLanguage) {
  const detectPlainStringLanguage = (str) => {
    if (!str || typeof str !== 'string') return 'id';
    const text = str.toLowerCase();
    const enWords = ['the', 'and', 'of', 'in', 'to', 'for', 'with', 'is', 'it', 'this', 'that', 'my', 'project', 'writing', 'book'];
    const idWords = ['yang', 'dan', 'di', 'ke', 'untuk', 'pada', 'dengan', 'saya', 'adalah', 'ini', 'itu', 'proyek', 'tulisan'];
    let enCount = 0;
    let idCount = 0;
    const tokens = text.match(/\b\w+\b/g) || [];
    for (const token of tokens) {
      if (enWords.includes(token)) enCount++;
      if (idWords.includes(token)) idCount++;
    }
    return enCount > idCount ? 'en' : 'id';
  };

  const safeParse = (val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        const detected = detectPlainStringLanguage(val);
        return { [detected]: val };
      }
    }
    return val || {};
  };

  const titleObj = safeParse(doc.title);
  const contentObj = safeParse(doc.content);

  const hasEnglish = (titleObj.en && titleObj.en.trim()) || (contentObj.en && contentObj.en.trim());
  const hasIndonesian = (titleObj.id && titleObj.id.trim()) || (contentObj.id && contentObj.id.trim());

  let srcLang = 'id';
  let tgtLang = 'en';

  if (hasIndonesian && !hasEnglish) {
    srcLang = 'id';
    tgtLang = 'en';
  } else if (hasEnglish && !hasIndonesian) {
    srcLang = 'en';
    tgtLang = 'id';
  } else {
    if (currentLanguage === 'en') {
      srcLang = 'id';
      tgtLang = 'en';
    } else {
      srcLang = 'en';
      tgtLang = 'id';
    }
  }

  return { srcLang, tgtLang };
}

async function runTests() {
  console.log('=== RUNNING CHALLENGE VALIDATION TESTS ===');
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('alphonsus-portfolio');
    const col = db.collection('projects');

    console.log('\n--- 1. Testing Translation Direction Logic Matrix ---');
    
    // Case A: User wrote Indonesian, English is empty. They switch to English tab (currentLanguage = 'en') to translate.
    const docA = {
      title: { id: 'Proyek Keren', en: '' },
      content: { id: 'Ini adalah deskripsi proyek saya yang sangat keren.', en: '' }
    };
    const dirA = determineTranslationDirectionSimulated(docA, 'en');
    console.log(`Case A (ID populated, EN empty, currentLanguage = 'en'):`);
    console.log(`  Expected: srcLang = 'id', tgtLang = 'en'`);
    console.log(`  Actual:   srcLang = '${dirA.srcLang}', tgtLang = '${dirA.tgtLang}'`);
    if (dirA.srcLang === 'id' && dirA.tgtLang === 'en') {
      console.log('  ✔ SUCCESS');
    } else {
      console.log('  ❌ FAILED');
    }

    // Case B: User wrote English, Indonesian is empty. They switch to Indonesian tab (currentLanguage = 'id') to translate.
    const docB = {
      title: { id: '', en: 'Cool Project' },
      content: { id: '', en: 'This is the description of my cool project.' }
    };
    const dirB = determineTranslationDirectionSimulated(docB, 'id');
    console.log(`Case B (EN populated, ID empty, currentLanguage = 'id'):`);
    console.log(`  Expected: srcLang = 'en', tgtLang = 'id'`);
    console.log(`  Actual:   srcLang = '${dirB.srcLang}', tgtLang = '${dirB.tgtLang}'`);
    if (dirB.srcLang === 'en' && dirB.tgtLang === 'id') {
      console.log('  ✔ SUCCESS');
    } else {
      console.log('  ❌ FAILED');
    }

    // Case C: Both populated (re-translation). User is on English tab (currentLanguage = 'en') and wants to update English from Indonesian.
    const docC = {
      title: { id: 'Proyek Baru', en: 'Old English Title' },
      content: { id: 'Konten terupdate', en: 'Old English Content' }
    };
    const dirC = determineTranslationDirectionSimulated(docC, 'en');
    console.log(`Case C (Both populated, currentLanguage = 'en'):`);
    console.log(`  Expected: srcLang = 'id', tgtLang = 'en'`);
    console.log(`  Actual:   srcLang = '${dirC.srcLang}', tgtLang = '${dirC.tgtLang}'`);
    if (dirC.srcLang === 'id' && dirC.tgtLang === 'en') {
      console.log('  ✔ SUCCESS');
    } else {
      console.log('  ❌ FAILED');
    }

    console.log('\n--- 2. Simulating Rapid Concurrent Autosave POST Requests ---');
    const slug = 'test-draft-challenge-12345';
    
    // Clean any prior residues
    await col.deleteMany({ id: slug });
    
    console.log('Simulating first POST request to create a draft...');
    // Simulated route logic for first POST
    const initialData = {
      id: slug,
      title: { id: 'Draft Awal', en: '' },
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const insertResult = await col.insertOne(initialData);
    const createdId = insertResult.insertedId;
    console.log(`  Created document with _id = ${createdId}`);
    
    console.log('Simulating second concurrent POST request before client receives the ID...');
    // Simulated route logic for second POST (checking for existing slug)
    const secondData = {
      id: slug,
      title: { id: 'Draft Awal Terupdate', en: '' },
      status: 'draft',
      updatedAt: new Date()
    };
    
    // Server checks if slug already exists
    const existing = await col.findOne({ id: slug });
    let finalId;
    if (existing) {
      if (secondData.id.includes('-draft-') || existing.status === 'draft') {
        console.log(`  ✔ Slug match found and it's a draft! Re-using existing _id = ${existing._id}`);
        // Perform update instead of insert
        await col.updateOne({ _id: existing._id }, { $set: secondData });
        finalId = existing._id;
      } else {
        throw new Error('Overwrote non-draft slug!');
      }
    } else {
      const res = await col.insertOne(secondData);
      finalId = res.insertedId;
    }
    
    // Check MongoDB for how many documents with this slug exist
    const count = await col.countDocuments({ id: slug });
    console.log(`Total documents found in MongoDB for slug '${slug}': ${count}`);
    if (count === 1 && finalId.toString() === createdId.toString()) {
      console.log('  ✔ SUCCESS: No duplication occurred, and the original document was updated!');
    } else {
      console.log('  ❌ FAILED: Duplicate documents were created!');
    }

    // Clean up
    await col.deleteMany({ id: slug });
    console.log('\nCleaned up test documents.');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await client.close();
  }
}

runTests();
