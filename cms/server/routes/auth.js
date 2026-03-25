import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

export default function authRoutes(db) {
  const router = Router();

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await db.collection('users').findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, username: user.username });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/change-password', async (req, res) => {
    try {
      const { username, oldPassword, newPassword } = req.body;
      const user = await db.collection('users').findOne({ username });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Wrong current password' });

      const hashed = await bcrypt.hash(newPassword, 10);
      await db.collection('users').updateOne({ _id: user._id }, { $set: { password: hashed } });
      res.json({ message: 'Password updated' });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
