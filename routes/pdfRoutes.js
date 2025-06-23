import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import PDFMerger from 'pdf-merger-js';
import logActivity from '../utils/logActivity.js'; // ✅ Tambahkan
import CV from '../models/CV.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/merge', authMiddleware, upload.array('files', 10), async (req, res) => {
  const merger = new PDFMerger();
  const files = req.files;
  const email = req.body.email || 'unknown'; // ✅ Ambil email dari body

  if (!files || files.length < 2) {
    return res.status(400).send('Minimal 2 file PDF diperlukan');
  }

  try {
    for (const file of files) {
      await merger.add(file.path);
    }

    const outputPath = `exports/Merger_${Date.now()}.pdf`;
    await merger.save(outputPath);

    files.forEach((file) => fs.unlinkSync(file.path));

    // ✅ Log aktivitas
    await logActivity('Merge PDF', req.user.email);
    await CV.findByIdAndUpdate(req.params.id, {
      isMerged: true,
      lastMerged: new Date()
    });
        res.download(outputPath, (err) => {
      if (err) console.error('Gagal download:', err);
      else fs.unlinkSync(outputPath); // delete after sent
    });
  } catch (err) {
    console.error('Gagal merger PDF:', err);
    res.status(500).send('Gagal menggabungkan PDF');
  }
});

export default router;
