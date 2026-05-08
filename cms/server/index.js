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
import fs from 'fs/promises';
import spellCheckRoutes from './routes/spellCheck.js';
import { initQueue } from './utils/autosaveQueue.js';

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
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
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
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
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

  // Spell-check routes (using hunspell-id dictionary)
  app.use('/api', spellCheckRoutes);

  // Stats endpoint for dashboard
  app.get('/api/stats', async (_req, res) => {
    const [projects, writings, books] = await Promise.all([
      db.collection('projects').countDocuments(),
      db.collection('writings').countDocuments(),
      db.collection('books').countDocuments(),
    ]);
    res.json({ projects, writings, books });
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

  app.listen(PORT, () => {
    console.log(`CMS API server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
