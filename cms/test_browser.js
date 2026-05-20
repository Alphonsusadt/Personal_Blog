import puppeteer from 'puppeteer';
import { MongoClient } from 'mongodb';

// Helper to sleep/wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTests() {
  console.log('=== STARTING AUTOMATED BROWSER TESTS ===');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('alphonsus-portfolio');
  const col = db.collection('projects');

  // Pre-cleanup in case of prior residues
  await col.deleteMany({ id: { $regex: /^(autosave-test|proyek-terjemahan|translation-test)/ } });

  const browser = await puppeteer.launch({
    headless: true, // Run headless so it works in background, but we can set to false if we want
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // --- LOGIN PHASE ---
    console.log('\n--- Logging in to CMS Admin ---');
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');
    
    // Click login button
    const loginBtn = await page.waitForSelector('button[type="submit"], button:not([disabled])');
    await loginBtn.click();
    
    // Wait for navigation or dashboard element
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✔ Logged in successfully.');

    // ==========================================
    // TASK 1: Create content draft, autosave, and exit immediately
    // ==========================================
    console.log('\n--- Task 1: Autosave and Exit immediately ---');
    await page.goto('http://localhost:5173/admin/projects/edit/new', { waitUntil: 'networkidle2' });
    
    // Wait for the title input
    await page.waitForSelector('input.text-2xl, input.text-3xl');
    
    // Ensure Indonesia tab is selected
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Indonesia') && b.className.includes('rounded-t-lg'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput && titleInput.placeholder.includes('Judul Proyek');
    }, { timeout: 5000 });

    // Fill Indonesian Title
    console.log('Typing title...');
    const titleInput1 = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
    });
    await titleInput1.type('Autosave Test Browser Draft');
    
    // Type in Description (Short Description in sidebar)
    console.log('Typing short description...');
    await page.type('textarea[placeholder*="Brief summary"]', 'Deskripsi singkat proyek autosave.');
    
    // Type in Content Markdown Editor
    console.log('Typing markdown content...');
    await page.type('textarea[placeholder*="Project content"]', 'Ini adalah konten detail untuk proyek autosave.');

    console.log('Waiting for autosave trigger (6 seconds)...');
    await sleep(6500);

    // Get current URL to verify it transitioned to edit mode with slug
    const currentUrl1 = page.url();
    console.log(`Current URL: ${currentUrl1}`);
    
    // Check if ID was assigned
    const idElement = await page.waitForSelector('code');
    const dbId1 = await page.evaluate(el => el.textContent.trim(), idElement);
    console.log(`Assigned DB ID: ${dbId1}`);

    if (currentUrl1.includes('/edit/new') || dbId1 === 'Unsaved') {
      throw new Error('Autosave did not transition the editor or assign a DB ID!');
    }
    console.log('✔ Editor transitioned and DB ID assigned successfully.');

    // Exit immediately by navigating to projects list page
    console.log('Exiting editor immediately...');
    await page.goto('http://localhost:5173/admin/projects', { waitUntil: 'networkidle2' });
    
    // Query database to check if project exists and there are NO duplicates
    const p1Count = await col.countDocuments({ id: 'autosave-test-browser-draft' });
    console.log(`MongoDB count for slug 'autosave-test-browser-draft': ${p1Count}`);
    if (p1Count === 1) {
      console.log('✔ Task 1 Passed: Exactly 1 document created via autosave.');
    } else {
      console.log(`❌ Task 1 Failed: Found ${p1Count} documents!`);
    }

    // ==========================================
    // TASK 2: ID to EN translation, test buttons, and exit
    // ==========================================
    console.log('\n--- Task 2: Translate ID to EN and Exit ---');
    await page.goto('http://localhost:5173/admin/projects/edit/new', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input.text-2xl, input.text-3xl');

    // Ensure Indonesia tab is selected
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Indonesia') && b.className.includes('rounded-t-lg'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput && titleInput.placeholder.includes('Judul Proyek');
    }, { timeout: 5000 });

    // Fill Indonesian content
    console.log('Typing ID content...');
    const titleInput2 = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
    });
    await titleInput2.type('Proyek Terjemahan ID ke EN');
    await page.type('textarea[placeholder*="Brief summary"]', 'Deskripsi Indonesia.');
    await page.type('textarea[placeholder*="Project content"]', 'Konten detail Indonesia.');

    console.log('Waiting 6.5s for autosave...');
    await sleep(6500);

    // Switch to English tab
    console.log('Switching to English Tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('English') && b.className.includes('rounded-t-lg'));
      if (btn) btn.click();
    });
    // Wait for the placeholder of the title input to change to English
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput && titleInput.placeholder.includes('Project Title');
    }, { timeout: 5000 });
    console.log('✔ English tab active.');

    // Debug: Log all inputs and textareas on the page
    await page.evaluate(() => {
      console.log('--- ALL INPUTS ---');
      Array.from(document.querySelectorAll('input, textarea')).forEach((el, idx) => {
        console.log(`[${idx}] Tag: ${el.tagName}, Placeholder: ${el.placeholder}, Value: ${el.value}`);
      });
    });

    const enTitleVal = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      // Find the main title input which has text-2xl or text-3xl
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput ? titleInput.value : null;
    });
    console.log(`English Title value before translation: "${enTitleVal}"`);

    // Let's test the translation buttons!
    // 1. Google Translate Button
    console.log('Clicking "Translate" (Google Translate)...');
    const translateBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Translate');
    });
    await translateBtn.click();
    
    // Wait for Translate to complete
    console.log('Waiting for translation response...');
    await sleep(5000);

    // 2. Hybrid Button
    console.log('Clicking "Hybrid" (Google + AI Polish)...');
    const hybridBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Hybrid');
    });
    await hybridBtn.click();
    console.log('Waiting for hybrid translation...');
    await sleep(8000);

    // 3. Smart AI Button
    console.log('Clicking "Smart AI"...');
    const smartAiBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Smart AI');
    });
    await smartAiBtn.click();
    console.log('Waiting for Smart AI translation...');
    await sleep(8000);

    // Read translated fields
    const translatedTitle = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput ? titleInput.value : null;
    });
    const translatedDesc = await page.evaluate(() => document.querySelector('textarea[placeholder*="Brief summary"]').value);
    const translatedContent = await page.evaluate(() => document.querySelector('textarea[placeholder*="Project content"]').value);
    
    console.log(`Translated Title: "${translatedTitle}"`);
    console.log(`Translated Description: "${translatedDesc}"`);
    console.log(`Translated Content snippet: "${translatedContent.slice(0, 40)}..."`);

    if (translatedTitle && translatedDesc && translatedContent) {
      console.log('✔ English translations successfully populated.');
    } else {
      console.log('❌ Failed: English translation fields remain empty!');
    }

    // Exit immediately
    console.log('Exiting editor...');
    await page.goto('http://localhost:5173/admin/projects', { waitUntil: 'networkidle2' });

    // Verify DB state
    const p2Doc = await col.findOne({ id: 'proyek-terjemahan-id-ke-en' });
    if (p2Doc && p2Doc.title && p2Doc.title.en && p2Doc.content && p2Doc.content.en) {
      console.log('✔ Task 2 Passed: English translations correctly persisted in MongoDB.');
    } else {
      console.log('❌ Task 2 Failed: English translations not stored in database!');
    }

    // ==========================================
    // TASK 3: EN to ID translation, test buttons, and exit
    // ==========================================
    console.log('\n--- Task 3: Translate EN to ID and Exit ---');
    await page.goto('http://localhost:5173/admin/projects/edit/new', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input.text-2xl, input.text-3xl');

    // Switch to English tab to author the post first in English
    console.log('Switching to English Tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('English') && b.className.includes('rounded-t-lg'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput && titleInput.placeholder.includes('Project Title');
    }, { timeout: 5000 });
    console.log('✔ English tab active.');

    // Fill English content
    console.log('Typing EN content...');
    await page.type('input[placeholder*="Project Title"]', 'Translation Test EN to ID');
    await page.type('textarea[placeholder*="Brief summary"]', 'English description here.');
    await page.type('textarea[placeholder*="Project content"]', 'English detail content here.');

    console.log('Waiting 6.5s for autosave...');
    await sleep(6500);

    // Switch to Indonesia tab
    console.log('Switching to Indonesia Tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Indonesia') && b.className.includes('rounded-t-lg'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput && titleInput.placeholder.includes('Judul Proyek');
    }, { timeout: 5000 });
    console.log('✔ Indonesia tab active.');

    // Click Translate button (Google)
    console.log('Clicking "Translate" (Google Translate)...');
    const translateBtn3 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Translate');
    });
    await translateBtn3.click();
    console.log('Waiting for translation response...');
    await sleep(5000);

    // Click Hybrid Button
    console.log('Clicking "Hybrid" (Google + AI Polish)...');
    const hybridBtn3 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Hybrid');
    });
    await hybridBtn3.click();
    console.log('Waiting for hybrid translation...');
    await sleep(8000);

    // Click Smart AI Button
    console.log('Clicking "Smart AI"...');
    const smartAiBtn3 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === 'Smart AI');
    });
    await smartAiBtn3.click();
    console.log('Waiting for Smart AI translation...');
    await sleep(8000);

    // Read translated fields
    const translatedTitleId = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find(i => i.className.includes('text-2xl') || i.className.includes('text-3xl'));
      return titleInput ? titleInput.value : null;
    });
    const translatedDescId = await page.evaluate(() => document.querySelector('textarea[placeholder*="Brief summary"]').value);
    const translatedContentId = await page.evaluate(() => document.querySelector('textarea[placeholder*="Project content"]').value);

    console.log(`Translated Title (ID): "${translatedTitleId}"`);
    console.log(`Translated Description (ID): "${translatedDescId}"`);
    console.log(`Translated Content snippet (ID): "${translatedContentId.slice(0, 40)}..."`);

    if (translatedTitleId && translatedDescId && translatedContentId) {
      console.log('✔ Indonesian translations successfully populated.');
    } else {
      console.log('❌ Failed: Indonesian translation fields remain empty!');
    }

    // Exit immediately
    console.log('Exiting editor...');
    await page.goto('http://localhost:5173/admin/projects', { waitUntil: 'networkidle2' });

    // Verify DB state
    const p3Doc = await col.findOne({ id: 'translation-test-en-to-id' });
    if (p3Doc && p3Doc.title && p3Doc.title.id && p3Doc.content && p3Doc.content.id) {
      console.log('✔ Task 3 Passed: Indonesian translations correctly persisted in MongoDB.');
    } else {
      console.log('❌ Task 3 Failed: Indonesian translations not stored in database!');
    }

  } catch (err) {
    console.error('❌ Browser Test Error:', err);
  } finally {
    // Cleanup test documents
    await col.deleteMany({ id: { $regex: /^(autosave-test|proyek-terjemahan|translation-test)/ } });
    console.log('\nCleaned up test documents.');
    await client.close();
    await browser.close();
    console.log('\n=== BROWSER TESTS COMPLETE ===');
  }
}

runBrowserTests();
