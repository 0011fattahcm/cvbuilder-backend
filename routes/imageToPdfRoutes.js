import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import logActivity from '../utils/logActivity.js'; // ⬅️ Tambahkan ini
import CV from '../models/CV.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/convert', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { size = 'original', merge = 'false', email = 'unknown' } = req.body;
  const isMerge = merge === 'true';
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'Tidak ada file yang diupload' });
  }

  try {
    const pdfBuffers = await Promise.all(files.map(async (file) => {
      const pdfDoc = await PDFDocument.create();
      const imageBytes = fs.readFileSync(file.path);
      let finalBuffer;

      if (size.toLowerCase() === 'a4') {
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const MARGIN = 20;

        const metadata = await sharp(file.path).metadata();
        const imgRatio = metadata.width / metadata.height;
        const maxWidth = A4_WIDTH - MARGIN * 2;
        const maxHeight = A4_HEIGHT - MARGIN * 2;
        const maxRatio = maxWidth / maxHeight;

        let targetWidth, targetHeight;
        if (imgRatio > maxRatio) {
          targetWidth = Math.floor(maxWidth);
          targetHeight = Math.floor(maxWidth / imgRatio);
        } else {
          targetHeight = Math.floor(maxHeight);
          targetWidth = Math.floor(maxHeight * imgRatio);
        }

        finalBuffer = await sharp(file.path)
          .resize({ width: targetWidth, height: targetHeight })
          .extend({
            top: Math.floor((A4_HEIGHT - targetHeight) / 2),
            bottom: Math.ceil((A4_HEIGHT - targetHeight) / 2),
            left: Math.floor((A4_WIDTH - targetWidth) / 2),
            right: Math.ceil((A4_WIDTH - targetWidth) / 2),
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg()
          .toBuffer();

        const image = await pdfDoc.embedJpg(finalBuffer);
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });
        return await pdfDoc.save();
      } else {
        const image = await pdfDoc.embedJpg(imageBytes);
        const dims = image.scale(1);
        const page = pdfDoc.addPage([dims.width, dims.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height
        });
        return await pdfDoc.save();
      }
    }));

    if (isMerge) {
      const mergedPdf = await PDFDocument.create();
      for (const buf of pdfBuffers) {
        const pdf = await PDFDocument.load(buf);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
      }
      const mergedBytes = await mergedPdf.save();

      // ✅ Log aktivitas merge
      await logActivity('Convert JPG ke PDF (Gabung)', req.user.email);

      res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(Buffer.from(mergedBytes));
    }

    const archiver = await import('archiver');
    const archive = archiver.default('zip');

    // ✅ Log aktivitas split
    await logActivity('Convert JPG ke PDF (Terpisah)', req.user.email);

    await CV.findByIdAndUpdate(req.params.id, {
      isJpgPdf: true,
      lastJpgPdf: new Date()
    });
        
    res.setHeader('Content-Disposition', 'attachment; filename="images_pdf.zip"');
    res.setHeader('Content-Type', 'application/zip');

    archive.pipe(res);
    pdfBuffers.forEach((buf, idx) => {
      archive.append(Buffer.from(buf), { name: `image_${idx + 1}.pdf` });
    });
    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal konversi JPG ke PDF' });
  } finally {
    files.forEach(file => fs.unlinkSync(file.path));
  }
});

export default router;
