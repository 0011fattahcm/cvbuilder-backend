// routes/cvAdminRoutes.js
import express from 'express';
import authAdminMiddleware from '../middleware/authAdminMiddleware.js';
import CV from '../models/CV.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', authAdminMiddleware, async (req, res) => {
  try {
    const cvs = await CV.find().populate('user').sort({ updatedAt: -1 });
    res.json(cvs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data CV' });
  }
});

export default router;
