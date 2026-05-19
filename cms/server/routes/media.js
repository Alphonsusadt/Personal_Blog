/**
 * Media Upload Routes
 * Backend endpoint untuk image upload
 * Menyimpan files ke file system atau cloud storage
 * API: POST /api/media/upload - Upload single image
 * API: POST /api/media/proxy-icon - Download & cache external icon
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import sharp from 'sharp';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
const ICONS_DIR = path.join(__dirname, '../../public/uploads/icons');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

async function getFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

import cloudinary from '../config/cloudinary.js';
import { authMiddleware } from '../middleware/auth.js';

// Ensure icons directory exists
fs.mkdir(ICONS_DIR, { recursive: true }).catch(() => {});

async function persistUpload(db, file, altText, uploadedBy) {
  const mediaCollection = db.collection('media');
  const hash = await getFileHash(file.path);
  const existing = await mediaCollection.findOne({ hash });

  if (existing) {
    await fs.unlink(file.path).catch(() => {});
    return {
      success: true,
      imageUrl: existing.url,
      altText: existing.altText || altText,
      fileName: existing.filename,
      uploadedAt: existing.uploadedAt,
      deduplicated: true,
    };
  }

  const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.CMS_PORT || 5000}`;
  let imageUrl = `${baseUrl}/uploads/${file.filename}`;
  let finalThumbUrl = '';
  let isCloudinary = false;
  const uploadedAt = new Date();

  // Attempt Cloudinary upload if configured
  if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'portfolio',
      });
      imageUrl = result.secure_url;
      // Generate a thumbnail URL using Cloudinary transformations
      finalThumbUrl = result.secure_url.replace('/upload/', '/upload/w_300,c_limit,q_auto/');
      isCloudinary = true;
      // We can remove the local temp file since it's uploaded
      await fs.unlink(file.path).catch(() => {});
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      // Fall back to local storage
    }
  }

  await mediaCollection.insertOne({
    filename: file.filename,
    originalName: file.originalname,
    altText,
    size: file.size,
    mimetype: file.mimetype,
    url: imageUrl,
    hash,
    uploadedAt,
    uploadedBy,
  });

  if (isCloudinary) {
    await mediaCollection.updateOne(
      { hash },
      { $set: { thumbnail: finalThumbUrl } }
    );
  } else {
    // Local Post-process: generate thumbnail and optimized main image
    const thumbName = `${file.filename.replace(/\.[^.]+$/, '')}-thumb.jpg`;
    const thumbPath = path.join(UPLOAD_DIR, thumbName);
    const filePath = file.path;

    try {
      // Create thumbnail (300px wide)
      await sharp(filePath)
        .resize({ width: 300 })
        .jpeg({ quality: 75 })
        .toFile(thumbPath);

      // Optimize main image: resize if wider than 1600 and recompress
      const image = sharp(filePath);
      const metadata = await image.metadata();
      if ((metadata.width || 0) > 1600) {
        await image.resize({ width: 1600 }).jpeg({ quality: 85 }).toFile(filePath + '.opt');
        await fs.rename(filePath + '.opt', filePath);
      } else {
        await image.jpeg({ quality: 85 }).toFile(filePath + '.opt');
        await fs.rename(filePath + '.opt', filePath);
      }

      // Update DB with new size and thumbnail info
      const stats = await fs.stat(filePath);
      await mediaCollection.updateOne(
        { hash },
        { $set: { size: stats.size, thumbnail: `${baseUrl}/uploads/${thumbName}` } }
      );
    } catch (err) {
      console.error('Post-process image error:', err);
    }
  }

  return {
    success: true,
    imageUrl,
    altText,
    fileName: file.filename,
    uploadedAt,
    deduplicated: false,
  };
}

// Configure multer untuk temporary file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${timestamp}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
});

export default function mediaRoutes(db) {
  const router = express.Router();

  /**
   * POST /api/media/upload
   * Upload single image
   * Body: FormData dengan fields:
   *   - file: File (image)
   *   - altText?: string
   *
   * Response:
   *   {
   *     success: boolean,
   *     imageUrl: string,
   *     altText?: string,
   *     fileName: string,
   *     uploadedAt: string
   *   }
   */
  router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const { altText = '' } = req.body;

      const result = await persistUpload(db, req.file, altText, req.user?.id || 'anonymous');

      res.json({
        ...result,
        uploadedAt: result.uploadedAt.toISOString(),
      });
    } catch (error) {
      console.error('Upload error:', error);

      // Clean up file if something failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          console.error('Failed to delete file:', e);
        }
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  });

  /**
   * POST /api/media/batch-upload
   * Upload multiple images sekaligus
   * Body: FormData dengan fields:
   *   - files: File[] (images)
   *
   * Response:
   *   {
   *     success: boolean,
   *     results: [
   *       {
   *         success: boolean,
   *         imageUrl?: string,
   *         error?: string
   *       }
   *     ]
   *   }
   */
  router.post('/batch-upload', authMiddleware, upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      const results = [];

      for (const file of req.files) {
        try {
          const result = await persistUpload(db, file, '', req.user?.id || 'anonymous');
          results.push({
            ...result,
            uploadedAt: result.uploadedAt.toISOString(),
          });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
          });
        }
      }

      res.json({
        success: true,
        results,
      });
    } catch (error) {
      console.error('Batch upload error:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Batch upload failed',
      });
    }
  });

  /**
   * GET /api/media/list
   * List semua uploaded images
   * Query params:
   *   - limit?: number (default: 20)
   *   - offset?: number (default: 0)
   *   - sort?: 'recent' | 'oldest' (default: 'recent')
   */
  router.get('/list', authMiddleware, async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      const sort = req.query.sort === 'oldest' ? 1 : -1;

      const mediaCollection = db.collection('media');
      const items = await mediaCollection
        .find({}, {
          projection: {
            filename: 1,
            originalName: 1,
            altText: 1,
            size: 1,
            mimetype: 1,
            url: 1,
            uploadedAt: 1,
            uploadedBy: 1,
            hash: 1,
          },
        })
        .sort({ uploadedAt: sort })
        .skip(offset)
        .limit(limit)
        .toArray();

      const total = await mediaCollection.countDocuments();

      res.json({
        success: true,
        items,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list media',
      });
    }
  });

  /**
   * DELETE /api/media/:filename
   * Delete uploaded image
   */
  router.delete('/:filename', authMiddleware, async (req, res) => {
    try {
      const { filename } = req.params;

      // Validate filename (prevent path traversal)
      if (!filename.match(/^[\w\-.]+(\.jpg|\.jpeg|\.png|\.gif|\.webp)$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename',
        });
      }

      const filePath = path.join(UPLOAD_DIR, filename);

      // Security: ensure file path resolves within upload directory
      const resolvedPath = path.resolve(filePath);
      const uploadDirResolved = path.resolve(UPLOAD_DIR);
      if (!resolvedPath.startsWith(uploadDirResolved)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Delete file
      await fs.unlink(filePath);

      // Delete metadata
      const mediaCollection = db.collection('media');
      await mediaCollection.deleteOne({ filename });

      res.json({ success: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: 'File not found',
        });
      }

      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete media',
      });
    }
  });

  // ── Proxy external icon: download, cache locally, return local URL ──
  router.post('/proxy-icon', authMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Only allow image URLs from known icon CDNs
    const allowedHosts = [
      'cdn-icons-png.flaticon.com',
      'cdn.iconscout.com',
      'cdn.jsdelivr.net',
    ];
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!allowedHosts.some((h) => parsedUrl.hostname.endsWith(h) || parsedUrl.hostname === h)) {
      return res.status(400).json({ error: `Domain ${parsedUrl.hostname} not allowed. Use icon CDNs.` });
    }

    try {
      // Use URL hash as filename for caching
      const urlHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
      const ext = parsedUrl.pathname.endsWith('.svg') ? '.svg' : '.png';
      const localPath = path.join(ICONS_DIR, `${urlHash}${ext}`);

      // If already cached, return immediately
      try {
        await fs.access(localPath);
        return res.json({ url: `/uploads/icons/${urlHash}${ext}`, cached: true });
      } catch { /* not cached yet */ }

      // Download the image
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AlphonsusCMS/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return res.status(502).json({ error: `Failed to fetch icon: ${response.status}` });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(localPath, buffer);

      res.json({ url: `/uploads/icons/${urlHash}${ext}`, cached: false });
    } catch (error) {
      console.error('[proxy-icon] Error:', error.message);
      res.status(500).json({ error: 'Failed to download icon' });
    }
  });

  return router;
}
