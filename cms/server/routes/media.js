/**
 * Media Upload Routes
 * Backend endpoint untuk image upload
 * Menyimpan files ke file system atau cloud storage
 * API: POST /api/media/upload - Upload single image
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer untuk temporary file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
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

    // Max size 5MB
    const maxSize = 5 * 1024 * 1024;
    if ((req).fileSize && (req).fileSize > maxSize) {
      cb(new Error('File size exceeds 5MB'));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
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
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const { altText = '' } = req.body;

      // Generate public URL (bisa disesuaikan dengan deployment)
      const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      // Optionally: Save metadata ke database
      const mediaCollection = db.collection('media');
      await mediaCollection.insertOne({
        filename: req.file.filename,
        originalName: req.file.originalname,
        altText: altText,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl,
        uploadedAt: new Date(),
        uploadedBy: req.user?.id || 'anonymous',
      });

      res.json({
        success: true,
        imageUrl,
        altText: altText,
        fileName: req.file.filename,
        uploadedAt: new Date().toISOString(),
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
  router.post('/batch-upload', upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
      const mediaCollection = db.collection('media');
      const results = [];

      for (const file of req.files) {
        try {
          const imageUrl = `${baseUrl}/uploads/${file.filename}`;

          // Save metadata
          await mediaCollection.insertOne({
            filename: file.filename,
            originalName: file.originalname,
            altText: '',
            size: file.size,
            mimetype: file.mimetype,
            url: imageUrl,
            uploadedAt: new Date(),
            uploadedBy: req.user?.id || 'anonymous',
          });

          results.push({
            success: true,
            imageUrl,
            fileName: file.filename,
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
  router.get('/list', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const sort = req.query.sort === 'oldest' ? 1 : -1;

      const mediaCollection = db.collection('media');
      const items = await mediaCollection
        .find({})
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
  router.delete('/:filename', async (req, res) => {
    try {
      const { filename } = req.params;

      // Validate filename (prevent path traversal)
      if (!filename.match(/^[\w\-.]+(\.jpg|\.jpeg|\.png|\.gif|\.webp)$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename',
        });
      }

      const uploadDir = path.join(__dirname, '../../public/uploads');
      const filePath = path.join(uploadDir, filename);

      // Security: ensure file path is within upload directory
      if (!filePath.startsWith(uploadDir)) {
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

  return router;
}
