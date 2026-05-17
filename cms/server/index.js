import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import writingsRoutes from './routes/writings.js';
import booksRoutes from './routes/books.js';
import aboutRoutes from './routes/about.js';
import homeRoutes from './routes/home.js';
import settingsRoutes from './routes/settings.js';
import mediaRoutes from './routes/media.js';
import categoriesRoutes from './routes/categories.js';
import fs from 'fs/promises';
import spellCheckRoutes from './routes/spellCheck.js';
import translationRoutes from './routes/translation.js';
import { initQueue } from './utils/autosaveQueue.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';
const PORT = process.env.CMS_PORT || 5000;

const parseSectionFlag = (value, fallback = true) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() !== 'false';
};

async function start() {
  // Connect to MongoDB with retry logic for resilience
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    serverSelectionTimeoutMS: 10_000,
    retryWrites: true,
  });

  await connectWithRetry(client);

  // Listen for connection drops and auto-reconnect
  client.on('connectionPoolCleared', () => {
    console.warn('[MongoDB] Connection pool cleared — will reconnect on next operation');
  });
  client.on('serverDescriptionChanged', (event) => {
    if (event.newDescription.type === 'Unknown') {
      console.warn('[MongoDB] Server became unavailable');
    }
  });

  const db = client.db(DB_NAME);

  // Start the background worker thread for RAM-Queue Autosaves
  initQueue(MONGODB_URI, DB_NAME);

  // Ensure default admin user exists (credentials from environment variables)
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    console.error('FATAL: ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set in cms/.env');
    process.exit(1);
  }
  const users = db.collection('users');
  const existing = await users.findOne({ username: adminUsername });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await users.insertOne({ username: adminUsername, password: hashed, createdAt: new Date() });
    console.log(`Default admin user created (username: ${adminUsername})`);
  }

  const sectionDefaults = {
    writings: { enabled: parseSectionFlag(process.env.SHOW_WRITINGS, true) },
    projects: { enabled: parseSectionFlag(process.env.SHOW_PROJECTS, true) },
    books: { enabled: parseSectionFlag(process.env.SHOW_BOOKS, true) },
  };

  const settingsCol = db.collection('settings');
  const settingsDoc = await settingsCol.findOne({ key: 'settings' });
  const settingsSections = settingsDoc?.sections || {};
  const shouldPatchSections = (
    settingsSections.writings?.enabled === undefined ||
    settingsSections.projects?.enabled === undefined ||
    settingsSections.books?.enabled === undefined
  );

  if (shouldPatchSections) {
    await settingsCol.updateOne(
      { key: 'settings' },
      {
        $set: {
          key: 'settings',
          'sections.writings.enabled': settingsSections.writings?.enabled ?? sectionDefaults.writings.enabled,
          'sections.projects.enabled': settingsSections.projects?.enabled ?? sectionDefaults.projects.enabled,
          'sections.books.enabled': settingsSections.books?.enabled ?? sectionDefaults.books.enabled,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const app = express();

  // Enable gzip/deflate compression for responses
  app.use(compression());

  // Log slow requests to help identify CMS bottlenecks
  const slowRequestThresholdMs = Number(process.env.CMS_SLOW_REQUEST_MS || 300);
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      if (durationMs >= slowRequestThresholdMs) {
        console.log(`[slow] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
      }
    });
    next();
  });

  // CORS configuration - allow frontend origin
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded files statically (fixed for Windows compatibility)
  const uploadsPath = path.join(__dirname, '../public/uploads');
  await fs.mkdir(uploadsPath, { recursive: true });
  console.log(`Serving uploads from: ${uploadsPath}`);
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '30d',
    immutable: true,
    etag: true,
  }));

  // Routes
  app.use('/api/auth', authRoutes(db));
  app.use('/api/projects', projectsRoutes(db));
  app.use('/api/writings', writingsRoutes(db));
  app.use('/api/books', booksRoutes(db));
  app.use('/api/about', aboutRoutes(db));
  app.use('/api/home', homeRoutes(db));
  app.use('/api/settings', settingsRoutes(db));
  app.use('/api/media', mediaRoutes(db));
  app.use('/api/categories', categoriesRoutes(db));

  // Translation routes (Translate, Hybrid, SmartAI buttons)
  app.use('/api', translationRoutes(db));

  // Spell-check routes (using hunspell-id dictionary)
  app.use('/api', spellCheckRoutes);

  // Stats endpoint (lightweight, used for auth verification)
  app.get('/api/stats', authMiddleware, async (_req, res) => {
    const [projects, writings, books] = await Promise.all([
      db.collection('projects').countDocuments(),
      db.collection('writings').countDocuments(),
      db.collection('books').countDocuments(),
    ]);
    res.json({ projects, writings, books });
  });

  // Consolidated dashboard endpoint — single request returns stats + recent published items
  app.get('/api/dashboard', authMiddleware, async (_req, res) => {
    const RECENT_LIMIT = 5;
    const publishedFilter = {
      visible: { $ne: false },
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishAt: { $lte: new Date() } },
      ],
    };
    const recentProjection = { title: 1, id: 1, status: 1, category: 1, updatedAt: 1, createdAt: 1, date: 1 };

    const [
      projectsCount, writingsCount, booksCount,
      recentWritings, recentBooks, recentProjects,
    ] = await Promise.all([
      db.collection('projects').countDocuments(),
      db.collection('writings').countDocuments(),
      db.collection('books').countDocuments(),
      db.collection('writings').find(
        { ...publishedFilter },
        { projection: { ...recentProjection, excerpt: 1 } },
      ).sort({ updatedAt: -1, createdAt: -1 }).limit(RECENT_LIMIT).toArray(),
      db.collection('books').find(
        { ...publishedFilter },
        { projection: { ...recentProjection, author: 1, rating: 1 } },
      ).sort({ updatedAt: -1, createdAt: -1 }).limit(RECENT_LIMIT).toArray(),
      db.collection('projects').find(
        { ...publishedFilter },
        { projection: { ...recentProjection, description: 1, devStatus: 1 } },
      ).sort({ updatedAt: -1, createdAt: -1 }).limit(RECENT_LIMIT).toArray(),
    ]);

    res.json({
      stats: { projects: projectsCount, writings: writingsCount, books: booksCount },
      recentWritings,
      recentBooks,
      recentProjects,
    });
  });

  // Create indexes for fast lookups
  await Promise.all([
    db.collection('projects').createIndex({ id: 1 }, { sparse: true }),
    db.collection('projects').createIndex({ status: 1, visible: 1 }),
    db.collection('projects').createIndex({ updatedAt: -1 }),
    db.collection('writings').createIndex({ id: 1 }, { sparse: true }),
    db.collection('writings').createIndex({ status: 1, visible: 1 }),
    db.collection('writings').createIndex({ updatedAt: -1 }),
    db.collection('books').createIndex({ id: 1 }, { sparse: true }),
    db.collection('books').createIndex({ status: 1, visible: 1 }),
    db.collection('books').createIndex({ updatedAt: -1 }),
    db.collection('media').createIndex({ hash: 1 }),
    db.collection('media').createIndex({ uploadedAt: -1 }),
    db.collection('settings').createIndex({ key: 1 }, { unique: true }),
  ]);
  console.log('Database indexes created');

  // Pre-warm settings cache
  const { setCachedSettings } = await import('./utils/settingsCache.js');
  const initialSettings = await db.collection('settings').findOne({ key: 'settings' });
  setCachedSettings(initialSettings);

  // ============================================================
  // TRANSLATION SYSTEM - VALIDATE EXTERNAL APIS
  // ============================================================
  validateExternalAPIs();

  app.listen(PORT, () => {
    console.log(`CMS API server running on http://localhost:${PORT}`);
  });
}

/**
 * Validate that required external APIs are configured
 * Provides helpful warnings if APIs are missing
 */
function validateExternalAPIs() {
  console.log('\n--- Translation System Startup Validation ---');
  
  const apiStatus = {
    google: process.env.GOOGLE_TRANSLATE_API_KEY ? '✅' : '❌',
    openrouter: process.env.OPENROUTER_API_KEY ? '✅' : '❌',
    ollama: process.env.USE_OLLAMA_FALLBACK === 'true' ? '✅ (configured)' : '⚠️  (disabled)',
  };
  
  console.log(`Google Translate:    ${apiStatus.google}`);
  console.log(`OpenRouter/LLM:      ${apiStatus.openrouter}`);
  console.log(`Ollama Fallback:     ${apiStatus.ollama}`);
  
  const hasGoogleKey = process.env.GOOGLE_TRANSLATE_API_KEY && 
                       process.env.GOOGLE_TRANSLATE_API_KEY !== 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE';
  const hasOpenrouterKey = process.env.OPENROUTER_API_KEY && 
                           process.env.OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE';
  
  if (!hasGoogleKey && process.env.USE_OLLAMA_FALLBACK !== 'true') {
    console.warn('\n⚠️  WARNING: Google Translate API key not configured!');
    console.warn('   Language detection will be limited');
  }
  
  if (!hasOpenrouterKey && process.env.USE_OLLAMA_FALLBACK !== 'true') {
    console.warn('\n⚠️  WARNING: OpenRouter API key not configured!');
    console.warn('   Advanced translation (Hybrid, Smart AI) will NOT work');
    console.warn('   Basic Google Translate will still work if key is set');
  }
  
  if (!hasGoogleKey && !hasOpenrouterKey && process.env.USE_OLLAMA_FALLBACK !== 'true') {
    console.error('\n❌ ERROR: No translation APIs configured!');
    console.error('   At least one of the following must be configured:');
    console.error('   - GOOGLE_TRANSLATE_API_KEY (in cms/.env)');
    console.error('   - OPENROUTER_API_KEY (in cms/.env)');
    console.error('   - USE_OLLAMA_FALLBACK=true + Ollama running on ' + (process.env.OLLAMA_BASE_URL || 'http://localhost:11434'));
    console.warn('\n   Translation endpoints will return user-friendly errors.\n');
  } else {
    console.log('\n✅ Translation system is ready!\n');
  }
}

// Start the server
start().catch(err => {
  console.error('Failed to start CMS server:', err);
  process.exit(1);
});

/**
 * Connect to MongoDB with exponential back-off retry.
 * Retries up to 5 times before giving up.
 */
const MONGO_RETRY_ATTEMPTS = 5;
const MONGO_RETRY_BASE_MS = 2000;

async function connectWithRetry(client, attempt = 1) {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return;
  } catch (err) {
    if (attempt >= MONGO_RETRY_ATTEMPTS) {
      console.error(`[MongoDB] Failed after ${attempt} attempts. Giving up.`);
      throw err;
    }
    const delay = MONGO_RETRY_BASE_MS * Math.pow(2, attempt - 1);
    console.warn(
      `[MongoDB] Connection attempt ${attempt}/${MONGO_RETRY_ATTEMPTS} failed: ${err.message}`
    );
    console.warn(`[MongoDB] Retrying in ${delay / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry(client, attempt + 1);
  }
}
