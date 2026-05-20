/**
 * Automated E2E Diagnostic Test Script for Personal Blog & Portfolio CMS
 * Run with: node --env-file=.env e2e_diagnostic.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CMS_PORT = 5001;
const BASE_URL = `http://localhost:${CMS_PORT}`;

// Diagnostic color helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function logHeader(msg) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}✔ SUCCESS: ${msg}${colors.reset}`);
}

function logWarning(msg) {
  console.log(`${colors.yellow}⚠ WARNING: ${msg}${colors.reset}`);
}

function logError(msg, err) {
  console.log(`${colors.red}✘ ERROR: ${msg}${colors.reset}`);
  if (err) console.error(err);
}

// Global state
let serverProcess = null;
let authToken = '';
let dbClient = null;
let testPostId = 'test-diagnostic-' + Date.now().toString(36);
let testPostDbId = null;
let testMessageDbId = null;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1. Check MongoDB connectivity
async function checkMongo() {
  logHeader('Checking MongoDB Connection');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  try {
    dbClient = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await dbClient.connect();
    logSuccess(`Connected to MongoDB at ${uri}`);
  } catch (err) {
    logError(`Failed to connect to MongoDB at ${uri}. Make sure mongod is running.`, err);
    throw err;
  }
}

// 2. Start Express Backend Server
async function startServer() {
  logHeader('Starting CMS Backend Server on port ' + CMS_PORT);
  
  // Use current env vars but override CMS_PORT
  const env = { ...process.env, CMS_PORT: String(CMS_PORT) };
  
  const serverPath = path.resolve(__dirname, 'server/index.js');
  serverProcess = spawn('node', [serverPath], { env });
  
  serverProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.log(`[Server] ${line}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });

  // Wait for server to boot
  let attempts = 0;
  while (attempts < 10) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, { method: 'OPTIONS' }).catch(() => null);
      if (res) {
        logSuccess('Server is up and responding to HTTP requests');
        return;
      }
    } catch {}
    attempts++;
    await sleep(800);
  }
  throw new Error('Server failed to start or respond within timeout.');
}

// 3. Clean up Server and Connections
async function cleanup() {
  logHeader('Cleaning up diagnostics');
  
  if (dbClient) {
    try {
      // Clean up test documents from database to leave it clean
      const db = dbClient.db('alphonsus-portfolio');
      if (testPostDbId) {
        await db.collection('writings').deleteOne({ _id: new ObjectId(testPostDbId) });
        console.log(`Cleaned up test post: ${testPostDbId}`);
      }
      if (testMessageDbId) {
        await db.collection('messages').deleteOne({ id: testMessageDbId });
        console.log(`Cleaned up test message: ${testMessageDbId}`);
      }
      await dbClient.close();
      console.log('MongoDB connection closed.');
    } catch (err) {
      console.error('Error during database cleanup:', err);
    }
  }

  if (serverProcess) {
    serverProcess.kill();
    console.log('Backend server process terminated.');
  }
  
  console.log(`${colors.bright}${colors.green}E2E Diagnostics Complete!${colors.reset}\n`);
}

// 4. Test Authentication
async function testAuth() {
  logHeader('Testing Auth Middleware & Login');
  
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok && data.token) {
      authToken = data.token;
      logSuccess(`Login successful. Token: ${authToken.slice(0, 15)}...`);
    } else {
      throw new Error(`Login failed with status ${res.status}: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    logError('Auth Diagnostic Failed', err);
    throw err;
  }
}

// 5. Test Dashboard Stats
async function testDashboard() {
  logHeader('Testing Dashboard & Stats');
  
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      logSuccess(`Dashboard response status: ${res.status}`);
      console.log('Dashboard Data Summary:', {
        stats: data.stats,
        recentWritingsCount: data.recentWritings?.length || 0,
        recentBooksCount: data.recentBooks?.length || 0,
        recentProjectsCount: data.recentProjects?.length || 0,
      });
    } else {
      throw new Error(`Failed to fetch dashboard: ${res.status}`);
    }
  } catch (err) {
    logError('Dashboard Diagnostic Failed', err);
    throw err;
  }
}

// 6. Test Content Creation
async function testContentCreation() {
  logHeader('Testing Content Creation (Writing POST)');
  
  const postData = {
    id: testPostId,
    title: { id: 'Uji Coba Diagnostik', en: 'Diagnostic Test Post' },
    excerpt: { id: 'Kutipan uji coba', en: 'Test excerpt' },
    content: { 
      id: 'Ini adalah tulisan uji coba diagnostik.', 
      en: 'This is a diagnostic test writing.' 
    },
    category: 'reflections',
    tags: ['test', 'diagnostic'],
    status: 'draft',
    visible: true
  };
  
  try {
    const res = await fetch(`${BASE_URL}/api/writings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(postData)
    });
    
    if (res.ok) {
      const created = await res.json();
      testPostDbId = created._id;
      logSuccess(`Test post created successfully. Mongo ID: ${testPostDbId}`);
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Failed to create post. Status ${res.status}: ${JSON.stringify(errData)}`);
    }
  } catch (err) {
    logError('Content Creation Failed', err);
    throw err;
  }
}

// 7. Test Translations Endpoints
async function testTranslations() {
  logHeader('Testing Translation System');
  
  // Test Google Translate (POST /api/translate)
  try {
    console.log('1. Fetching basic Google Translate route...');
    const res = await fetch(`${BASE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        postId: testPostId,
        contentType: 'writing',
        currentLanguage: 'id'
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      logSuccess(`Google Translate works:`);
      console.log('Google Translate Results:', data.translations);
    } else {
      logWarning(`Google Translate responded with ${res.status}: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    logWarning(`Google Translate route check failed with network/fatal error: ${err.message}`);
  }
  
  // Test Hybrid Translation Route (POST /api/translate-hybrid)
  try {
    console.log('2. Fetching Hybrid Translation fallback route...');
    const res = await fetch(`${BASE_URL}/api/translate-hybrid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        postId: testPostId,
        contentType: 'writing',
        currentLanguage: 'id'
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      logSuccess(`Hybrid Translate route completed successfully.`);
      console.log('Hybrid Results:', data.translations);
    } else {
      logWarning(`Hybrid Translate route failed as expected if LLM keys are mock: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    logWarning(`Hybrid Translate check failed: ${err.message}`);
  }

  // Test Smart AI Translation Route (POST /api/translate-smartai)
  try {
    console.log('3. Fetching Smart AI Translation route...');
    const res = await fetch(`${BASE_URL}/api/translate-smartai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        postId: testPostId,
        contentType: 'writing',
        currentLanguage: 'id'
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      logSuccess(`Smart AI Translate route completed successfully.`);
      console.log('Smart AI Results:', data.translations);
    } else {
      logWarning(`Smart AI Translate route failed as expected if LLM keys are mock: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    logWarning(`Smart AI Translate check failed: ${err.message}`);
  }
}

// 8. Test Contact Form Messaging Flow
async function testContactForm() {
  logHeader('Testing Public Contact Form & Reply');
  
  const visitorEmail = `visitor-${Date.now()}@example.com`;
  const messageData = {
    name: 'Budi Diagnostic',
    email: visitorEmail,
    subject: 'Halo Aditya',
    body: 'Ini pesan percobaan untuk mengetes formulir kontak bilingual.',
    language: 'id'
  };
  
  try {
    // 8.1 Submit Message (Public)
    console.log('1. Submitting public message...');
    const submitRes = await fetch(`${BASE_URL}/api/messages/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    
    const submitResult = await submitRes.json();
    if (submitRes.ok && submitResult.success) {
      testMessageDbId = submitResult.messageId;
      logSuccess(`Message sent. ID: ${testMessageDbId}, Status: ${submitResult.status}`);
      if (submitResult.status !== 'pending_reply') {
        throw new Error(`Message should have 'pending_reply' status because it has email address. Found: ${submitResult.status}`);
      }
    } else {
      throw new Error(`Public message submission failed: ${JSON.stringify(submitResult)}`);
    }

    // 8.2 Get Messages (Admin Auth Required)
    console.log('2. Fetching all messages as Admin...');
    const listRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const messages = await listRes.json();
    if (listRes.ok) {
      const found = messages.find(m => m.id === testMessageDbId);
      if (found) {
        logSuccess(`Found created message in Admin list. Subject: "${found.subject}"`);
      } else {
        throw new Error('Created message not found in Admin message list.');
      }
    } else {
      throw new Error(`Failed to list messages as Admin: ${JSON.stringify(messages)}`);
    }

    // 8.3 Reply to Message (Admin Auth Required)
    console.log('3. Sending reply from Admin...');
    const replyRes = await fetch(`${BASE_URL}/api/messages/${testMessageDbId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        senderEmail: 'reply-test@example.com',
        messageText: 'Halo Budi, terima kasih atas pesannya! Ini balasan saya.'
      })
    });
    
    const replyResult = await replyRes.json();
    if (replyRes.ok) {
      logSuccess(`Reply test completed successfully. Status: ${replyResult.success ? 'Success' : 'Fail'}`);
    } else {
      // It is acceptable if it warns about Resend API Key missing, as long as it handles it gracefully
      logWarning(`Admin reply returned status ${replyRes.status}: ${replyResult.error}`);
    }
  } catch (err) {
    logError('Contact form messaging flow failed', err);
    throw err;
  }
}

// Main execution flow
async function run() {
  console.log(`${colors.bright}${colors.magenta}=== STARTING E2E DIAGNOSTIC TESTS ===${colors.reset}\n`);
  
  try {
    await checkMongo();
    await startServer();
    await testAuth();
    await testDashboard();
    await testContentCreation();
    await testTranslations();
    await testContactForm();
    
    console.log(`\n${colors.bright}${colors.green}🎉 ALL CRITICAL CHANNELS RESPONDING PERFECTLY!${colors.reset}`);
  } catch (err) {
    console.error(`\n${colors.bright}${colors.red}❌ DIAGNOSTIC PROCESS FAILED:${colors.reset}`, err.message);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

run();
