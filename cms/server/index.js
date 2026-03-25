import 'dotenv/config';
import express from 'express';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';
const PORT = process.env.CMS_PORT || 5000;

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(DB_NAME);

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

  const app = express();

  // CORS configuration - allow frontend origin
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded files statically (fixed for Windows compatibility)
  const uploadsPath = path.join(__dirname, '../public/uploads');
  console.log(`Serving uploads from: ${uploadsPath}`);
  app.use('/uploads', express.static(uploadsPath));

  // Routes
  app.use('/api/auth', authRoutes(db));
  app.use('/api/projects', projectsRoutes(db));
  app.use('/api/writings', writingsRoutes(db));
  app.use('/api/books', booksRoutes(db));
  app.use('/api/about', aboutRoutes(db));
  app.use('/api/home', homeRoutes(db));
  app.use('/api/settings', settingsRoutes(db));
  app.use('/api/media', mediaRoutes(db));

  // Stats endpoint for dashboard
  app.get('/api/stats', async (_req, res) => {
    const [projects, writings, books] = await Promise.all([
      db.collection('projects').countDocuments(),
      db.collection('writings').countDocuments(),
      db.collection('books').countDocuments(),
    ]);
    res.json({ projects, writings, books });
  });

  app.listen(PORT, () => {
    console.log(`CMS API server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
